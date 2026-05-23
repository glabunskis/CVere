import { after } from 'next/server';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
  UI_MESSAGE_STREAM_HEADERS,
  type UIMessage,
} from 'ai';

import {
  ProSubscriptionRequiredError,
  requireActiveSubscription,
} from '@/features/account/controllers/require-active-subscription';
import { chatPostBodySchema } from '@/features/chat/schemas';
import { appendMessages, loadMessages } from '@/features/chat/storage/chat-message-store';
import { generateAndSaveSessionTitle } from '@/features/chat/storage/chat-session-store';
import { CHAT_SYSTEM_PROMPT } from '@/features/chat/system-prompt';
import { buildAchievementTools } from '@/features/chat/tools/achievement-tools';
import { buildContentTools, MUTATING_TOOLS } from '@/features/chat/tools/content-tools';
import { buildEntryTools } from '@/features/chat/tools/entry-tools';
import { buildIdentityTools } from '@/features/chat/tools/identity-tools';
import { buildSectionTools } from '@/features/chat/tools/section-tools';
import { buildStyleTools } from '@/features/chat/tools/style-tools';
import { buildVacancyTools } from '@/features/chat/tools/vacancy-tools';
import { renderAndUploadMasterCv } from '@/features/previewer/render';
import { getChatModel } from '@/libs/ai/chat-model';
import {
  getChatStreamId,
  getResumableStreamContext,
} from '@/libs/ai/resumable-stream';
import { logger } from '@/libs/logger';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export const maxDuration = 60;

type ChatRequestBody = {
  sessionId?: string;
  messages?: UIMessage[];
};

export async function POST(req: Request): Promise<Response> {
  // 1. Auth — using getUser() directly so we can return 401 cleanly.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Subscription gate. Off by default; flip CHAT_REQUIRE_SUBSCRIPTION=true to enforce.
  if (process.env.CHAT_REQUIRE_SUBSCRIPTION === 'true') {
    try {
      await requireActiveSubscription();
    } catch (err) {
      if (err instanceof ProSubscriptionRequiredError) {
        return new Response(err.message, { status: err.httpStatus });
      }
      throw err;
    }
  }

  // 3. Parse body. Session id is required in Phase 3.
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }
  const parsed = chatPostBodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid request body', { status: 400 });
  }

  const url = new URL(req.url);
  const sessionId = parsed.data.sessionId || url.searchParams.get('sessionId') || '';
  if (!sessionId) {
    return new Response('sessionId is required', { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from('chat_session')
    .select('id, title')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (sessionError) {
    logger.error({ err: sessionError, userId: user.id, sessionId }, 'chat: session lookup failed');
    return new Response('Failed to load chat session', { status: 500 });
  }
  if (!session) {
    return new Response('Chat session not found', { status: 404 });
  }

  const incomingMessages = (parsed.data.messages ?? []) as UIMessage[];

  // 4. Persist any user-side messages we don't already have. Persisting
  // before the stream means the user's prompt is durable even if generation
  // fails.
  const existing = await loadMessages(sessionId);
  const existingIds = new Set(existing.map((m) => m.id));
  const newClientMessages = incomingMessages.filter((m) => !existingIds.has(m.id));
  if (newClientMessages.length > 0) {
    try {
      await appendMessages(sessionId, user.id, newClientMessages);
    } catch (err) {
      logger.error(
        { err, userId: user.id, sessionId },
        'chat: failed to persist incoming messages',
      );
      return new Response('Failed to persist chat history', { status: 500 });
    }
  }

  // 5. Build tools with the user closure. Kept as one flat object — the route
  // does not gate tools by surface or session kind.
  const tools = {
    ...buildStyleTools(user),
    ...buildContentTools(user),
    ...buildEntryTools(user),
    ...buildSectionTools(user),
    ...buildIdentityTools(user),
    ...buildAchievementTools(user),
    ...buildVacancyTools(user),
  };

  // Tracks whether any mutating tool was called. End-of-turn render runs only
  // when this is true; signalled to the client via a `data-preview-dirty` part.
  let dirty = false;

  // Snapshot of message ids already in the DB, used in onFinish to diff what
  // streamText produced and persist only the new (assistant) messages.
  const persistedIds = new Set([...existingIds, ...newClientMessages.map((m) => m.id)]);

  const modelMessages = await convertToModelMessages(incomingMessages);

  const stream = createUIMessageStream({
    originalMessages: incomingMessages,
    execute: ({ writer }) => {
      const result = streamText({
        model: getChatModel(),
        system: CHAT_SYSTEM_PROMPT,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(8),
        // Smooth out bursty token deltas so the client renders text at a
        // steady, readable cadence instead of in chunky jumps. Word-level
        // chunking gives a typewriter feel; 25 ms ≈ ~40 words/sec.
        experimental_transform: smoothStream({ delayInMs: 25, chunking: 'word' }),
        experimental_telemetry: {
          isEnabled: true,
          functionId: 'chat-route',
          metadata: { userId: user.id, sessionId },
        },
        onStepFinish: ({ toolCalls }) => {
          for (const call of toolCalls ?? []) {
            const toolName = (call as { toolName?: string }).toolName;
            if (toolName) {
              logger.info(
                { userId: user.id, tool: toolName, toolCallId: call.toolCallId },
                'chat-route tool call',
              );
              if (MUTATING_TOOLS.has(toolName)) dirty = true;
            }
          }
        },
        onFinish: async () => {
          // End-of-turn render. Runs after the LLM is done but before the
          // SSE stream closes, so the data part is delivered in-band.
          if (!dirty) return;
          try {
            await renderAndUploadMasterCv(user);
            writer.write({
              type: 'data-preview-dirty',
              data: { renderedAt: new Date().toISOString() },
            });
            logger.info({ userId: user.id }, 'chat-route preview re-rendered');
          } catch (err) {
            logger.error(
              { err, userId: user.id },
              'chat-route end-of-turn render failed',
            );
          }
        },
        onError: ({ error }) => {
          logger.error({ err: error, userId: user.id }, 'chat-route stream error');
        },
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async ({ messages }) => {
      try {
        const newMessages = messages.filter((m) => !persistedIds.has(m.id));
        if (newMessages.length > 0) {
          await appendMessages(sessionId, user.id, newMessages);
        }

        const firstUserMessageText = getFirstUserMessageText(incomingMessages);
        if (firstUserMessageText) {
          // `after()` runs outside the request lifetime, so auth-cookie writes
          // from supabase-ssr are ignored; this task only does DB reads/writes.
          after(async () => {
            await generateAndSaveSessionTitle({
              userId: user.id,
              sessionId,
              firstUserMessage: firstUserMessageText,
            });
          });
        }
      } catch (err) {
        // Stream is already done client-side; log and swallow.
        logger.error(
          { err, userId: user.id, sessionId },
          'chat-route failed to persist assistant messages',
        );
      }
    },
    onError: (error) => {
      logger.error({ err: error, userId: user.id }, 'chat-route ui stream error');
      return error instanceof Error ? error.message : 'Unknown error';
    },
  });

  return createUIMessageStreamResponse({
    stream,
    // Tee a copy of the SSE bytes into Upstash Redis so that a reload mid-turn
    // can resume the stream via GET. Falls back to a regular non-resumable
    // stream when UPSTASH_REDIS_REST_* are not set (the helper returns null).
    consumeSseStream: async ({ stream: sseStream }) => {
      const ctx = getResumableStreamContext();
      if (!ctx) return;
      try {
        await ctx.createNewResumableStream(
          getChatStreamId(sessionId),
          () => sseStream,
        );
      } catch (err) {
        logger.error(
          { err, userId: user.id, sessionId },
          'chat-route: failed to create resumable stream',
        );
      }
    },
  });
}

/**
 * Resume an in-flight chat stream after a client reload. Returns:
 * - 401 if the request is not authenticated.
 * - 204 if Upstash Redis is not configured, the user has no active stream, or
 *   the previous stream has already finished.
 * - 200 with the SSE stream re-attached to the live producer otherwise.
 *
 */
export async function GET(req: Request): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const ctx = getResumableStreamContext();
  if (!ctx) {
    return new Response(null, { status: 204 });
  }

  const sessionId = new URL(req.url).searchParams.get('sessionId');
  if (!sessionId) {
    return new Response('sessionId is required', { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from('chat_session')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (sessionError) {
    logger.error(
      { err: sessionError, userId: user.id, sessionId },
      'chat-route: session lookup failed on resume',
    );
    return new Response(null, { status: 204 });
  }
  if (!session) {
    return new Response(null, { status: 204 });
  }

  const streamId = getChatStreamId(sessionId);

  try {
    const has = await ctx.hasExistingStream(streamId);
    if (!has || has === 'DONE') {
      return new Response(null, { status: 204 });
    }

    const resumed = await ctx.resumeExistingStream(streamId);
    if (!resumed) {
      return new Response(null, { status: 204 });
    }

    return new Response(resumed, { headers: UI_MESSAGE_STREAM_HEADERS });
  } catch (err) {
    logger.error(
      { err, userId: user.id, sessionId },
      'chat-route: failed to resume existing stream',
    );
    return new Response(null, { status: 204 });
  }
}

function getFirstUserMessageText(messages: UIMessage[]): string | null {
  for (const message of messages) {
    if (message.role !== 'user') continue;
    const text = getTextFromParts(message.parts).trim();
    if (text.length > 0) return text;
  }
  return null;
}

function getTextFromParts(parts: UIMessage['parts']): string {
  const chunks: string[] = [];
  for (const part of parts) {
    if (part.type === 'text' && typeof part.text === 'string') {
      chunks.push(part.text);
    }
  }
  return chunks.join(' ');
}
