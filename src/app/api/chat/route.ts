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
import { appendMessages, loadMessages } from '@/features/chat/storage/chat-message-store';
import { CHAT_SYSTEM_PROMPT } from '@/features/chat/system-prompt';
import { buildContentTools, MUTATING_TOOLS } from '@/features/chat/tools/content-tools';
import { buildStyleTools } from '@/features/chat/tools/style-tools';
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

  // 3. Parse body. v6 `useChat` POSTs `{ messages: UIMessage[] }`.
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }
  const incomingMessages = body.messages ?? [];
  if (incomingMessages.length === 0) {
    return new Response('messages must be a non-empty array', { status: 400 });
  }

  // 4. Persist any user-side messages we don't already have. Persisting
  // before the stream means the user's prompt is durable even if generation
  // fails.
  const existing = await loadMessages(user.id);
  const existingIds = new Set(existing.map((m) => m.id));
  const newClientMessages = incomingMessages.filter((m) => !existingIds.has(m.id));
  if (newClientMessages.length > 0) {
    try {
      await appendMessages(user.id, newClientMessages);
    } catch (err) {
      logger.error({ err, userId: user.id }, 'chat: failed to persist incoming messages');
      return new Response('Failed to persist chat history', { status: 500 });
    }
  }

  // 5. Build tools with the user closure.
  const tools = {
    ...buildStyleTools(user),
    ...buildContentTools(user),
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
          metadata: { userId: user.id },
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
          await appendMessages(user.id, newMessages);
        }
      } catch (err) {
        // Stream is already done client-side; log and swallow.
        logger.error(
          { err, userId: user.id },
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
          getChatStreamId(user.id),
          () => sseStream,
        );
      } catch (err) {
        logger.error(
          { err, userId: user.id },
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
 * The stream id is derived from the user id (singleton chat per user), so the
 * client never needs to pass an id.
 */
export async function GET(): Promise<Response> {
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

  const streamId = getChatStreamId(user.id);

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
      { err, userId: user.id },
      'chat-route: failed to resume existing stream',
    );
    return new Response(null, { status: 204 });
  }
}
