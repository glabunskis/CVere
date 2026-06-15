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

import type { AiProfile } from '@/entities/cv';
import { getSelectedCv, renderAndUploadCv } from '@/entities/cv';
import {
  ProSubscriptionRequiredError,
  requireActiveSubscription,
} from '@/entities/subscription';
import {
  appendMessages,
  buildAchievementTools,
  buildContentTools,
  buildCvMetaTools,
  buildEntryTools,
  buildIdentityTools,
  buildLayoutTools,
  buildSectionTools,
  buildStyleTools,
  buildVacancyTools,
  CHAT_SYSTEM_PROMPT,
  chatPostBodySchema,
  generateAndSaveSessionTitle,
  loadMessages,
  MUTATING_TOOLS,
} from '@/features/chat';
import { loadCvSnapshot, recordCvVersion } from '@/features/cv-history';
import { getChatModel } from '@/shared/api/ai/chat-model';
import {
  getChatStreamId,
  getResumableStreamContext,
} from '@/shared/api/ai/resumable-stream';
import { createSupabaseServerClient } from '@/shared/api/supabase/supabase-server-client';
import { logger } from '@/shared/lib/logger';

export const maxDuration = 60;
// SSE route: never statically optimize/cache, so chunks flush incrementally.
export const dynamic = 'force-dynamic';

type ChatRequestBody = {
  sessionId?: string;
  messages?: UIMessage[];
  context?: {
    cv?: { id: string } | null;
  };
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

  const contextCvId = parsed.data.context?.cv?.id ?? null;
  const selectedCv = await getSelectedCv(user.id);
  const activeCvId = contextCvId ?? selectedCv.id;
  const firstUserMessageText = getFirstUserMessageText(incomingMessages);

  const dirtyCvIds = new Set<string>();
  const markDirtyCv = (cvId: string) => {
    dirtyCvIds.add(cvId);
  };

  // Mutable target for the turn. The createCv tool flips this to a freshly
  // created copy so later tool calls (and the dirty-CV fallback) land on the
  // new CV without the model threading the id through every call.
  const activeCvRef = { current: activeCvId };
  // Drained in onStepFinish: signals the client to switch the previewer to a
  // CV the agent created mid-turn.
  const createdCvEvents: { cvId: string; title: string }[] = [];

  // Per-turn version capture. We snapshot a CV's pre-edit state lazily — on the
  // first mutating tool call that targets it — rather than snapshotting every
  // CV up front. Eager snapshotting blocked time-to-first-token behind N CV
  // reads before the stream could even start; lazy capture lets generation
  // begin immediately and only pays for the CVs actually touched this turn.
  // onFinish then records one reversible version per touched CV, collapsing
  // every tool call in the assistant reply.
  const beforeSnapshots = new Map<string, AiProfile>();
  const beforeSnapshotInFlight = new Map<string, Promise<void>>();
  const ensureBeforeSnapshot = (cvId: string): Promise<void> => {
    if (beforeSnapshots.has(cvId)) return Promise.resolve();
    const existing = beforeSnapshotInFlight.get(cvId);
    if (existing) return existing;
    // Capture before the mutation runs. Concurrent tool calls targeting the
    // same CV share this single in-flight read, so the baseline reflects the
    // pre-turn state regardless of execution order.
    const pending = loadCvSnapshot(user, cvId)
      .then((snapshot) => {
        beforeSnapshots.set(cvId, snapshot);
      })
      .catch((err) => {
        logger.error(
          { err, userId: user.id, cvId },
          'chat-route failed to snapshot CV before edit',
        );
      });
    beforeSnapshotInFlight.set(cvId, pending);
    return pending;
  };

  // Snapshot of message ids already in the DB, used in onFinish to diff what
  // streamText produced and persist only the new (assistant) messages.
  const persistedIds = new Set([...existingIds, ...newClientMessages.map((m) => m.id)]);

  const modelMessages = await convertToModelMessages(incomingMessages);
  const systemPrompt = `${CHAT_SYSTEM_PROMPT}\n\nContext: selected CV id is ${activeCvId}.`;

  const stream = createUIMessageStream({
    originalMessages: incomingMessages,
    execute: ({ writer }) => {
      // Kept as one flat object — tools are never gated by session kind.
      const tools = {
        ...buildStyleTools(user, activeCvRef),
        ...buildLayoutTools(user, activeCvRef),
        ...buildCvMetaTools(user, activeCvRef, async (info) => {
          createdCvEvents.push(info);
          // Capture the freshly created copy's baseline before any subsequent
          // tool call edits it, so its version diff covers only this turn.
          await ensureBeforeSnapshot(info.cvId);
        }),
        ...buildContentTools(user, activeCvRef),
        ...buildEntryTools(user, activeCvRef),
        ...buildSectionTools(user, activeCvRef),
        ...buildIdentityTools(user, activeCvRef),
        ...buildAchievementTools(user, activeCvRef),
        ...buildVacancyTools(user, activeCvRef),
      };

      // Capture each touched CV's pre-edit baseline on the first mutating tool
      // call that targets it. `createCv` is excluded: it captures the freshly
      // created copy's baseline itself via the onCvCreated callback above (its
      // edits land on the new CV, not the source).
      for (const [name, toolDef] of Object.entries(tools)) {
        if (name === 'createCv' || !MUTATING_TOOLS.has(name)) continue;
        const entry = toolDef as { execute?: (...args: unknown[]) => unknown };
        const original = entry.execute;
        if (typeof original !== 'function') continue;
        entry.execute = async (...args: unknown[]) => {
          const cvId = readCvIdFromToolCall(args[0]) ?? activeCvRef.current;
          await ensureBeforeSnapshot(cvId);
          return original(...args);
        };
      }

      const result = streamText({
        model: getChatModel(),
        system: systemPrompt,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(20),
        // Smooth out bursty token deltas so the client renders text at a
        // steady, readable cadence instead of in chunky jumps. Word-level
        // chunking gives a typewriter feel; 25 ms ≈ ~40 words/sec.
        experimental_transform: smoothStream({ delayInMs: 25, chunking: 'word' }),
        experimental_telemetry: {
          isEnabled: true,
          functionId: 'chat-route',
          metadata: { userId: user.id, sessionId },
        },
        onStepFinish: ({ toolCalls, toolResults }) => {
          for (const call of toolCalls ?? []) {
            const toolName = (call as { toolName?: string }).toolName;
            if (toolName) {
              logger.info(
                { userId: user.id, tool: toolName, toolCallId: call.toolCallId },
                'chat-route tool call',
              );
            }
          }
          // Only treat a tool as having mutated a CV if its execute resolved
          // (no throw). Each tool result carries the cvId it actually targeted
          // (defaulting to the selected CV when the agent omitted cvId); we
          // mark that CV dirty so it re-renders once at end-of-turn.
          for (const result of toolResults ?? []) {
            const toolName = (result as { toolName?: string }).toolName;
            if (!toolName || !MUTATING_TOOLS.has(toolName)) continue;
            const cvId = readCvIdFromToolCall(result.input) ?? activeCvRef.current;
            markDirtyCv(cvId);
          }

          // A new CV was created this step (e.g. a tailoring copy). Render it
          // and tell the client to switch the previewer to it.
          while (createdCvEvents.length > 0) {
            const event = createdCvEvents.shift();
            if (!event) break;
            markDirtyCv(event.cvId);
            writer.write({ type: 'data-cv-created', data: event });
            logger.info({ userId: user.id, cvId: event.cvId }, 'chat-route cv created');
          }
        },
        onFinish: async () => {
          // End-of-turn render. Runs after generation but before stream close,
          // so data parts arrive in-band.
          if (dirtyCvIds.size > 0) {
            for (const cvId of dirtyCvIds) {
              try {
                const before = beforeSnapshots.get(cvId);
                if (before) {
                  const after = await loadCvSnapshot(user, cvId);
                  await recordCvVersion({
                    user,
                    cvId,
                    before,
                    after,
                    source: 'chat',
                    label: firstUserMessageText ? firstUserMessageText.slice(0, 120) : null,
                  });
                }
                await renderAndUploadCv({ user, cvId });
                writer.write({
                  type: 'data-preview-dirty',
                  data: {
                    cvId,
                    renderedAt: new Date().toISOString(),
                  },
                });
                logger.info(
                  { userId: user.id, cvId },
                  'chat-route preview re-rendered',
                );
              } catch (err) {
                logger.error(
                  { err, userId: user.id, cvId },
                  'chat-route end-of-turn render failed',
                );
                writer.write({
                  type: 'data-preview-error',
                  data: {
                    cvId,
                    message: err instanceof Error ? err.message : 'Unknown rendering error',
                  },
                });
              }
            }
          }

          if (firstUserMessageText) {
            const generatedTitle = await generateAndSaveSessionTitle({
              userId: user.id,
              sessionId,
              firstUserMessage: firstUserMessageText,
            });
            if (generatedTitle) {
              writer.write({
                type: 'data-session-title',
                data: {
                  sessionId,
                  title: generatedTitle,
                },
              });
            }
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
    // `no-transform` tells any intermediary not to compress/transform the SSE
    // response (a streaming compressor buffers a window before emitting). The
    // SDK already sets `x-accel-buffering: no`.
    headers: {
      'cache-control': 'no-cache, no-transform',
    },
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

    // `resumed` is a stream of SSE *strings* (`data: {...}\n\n`). A Response
    // body must be a byte stream, so encode it — mirroring how the AI SDK's
    // POST path pipes its SSE stream through TextEncoderStream before
    // responding. Without this the framing is mangled and the client's SSE
    // parser never emits an event (the resumed stream hangs at "submitted").
    return new Response(resumed.pipeThrough(new TextEncoderStream()), {
      headers: {
        ...UI_MESSAGE_STREAM_HEADERS,
        // See POST: `no-transform` so no intermediary compresses (and buffers)
        // the resumed SSE stream.
        'cache-control': 'no-cache, no-transform',
      },
    });
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

function readCvIdFromToolCall(input: unknown): string | null {
  if (typeof input !== 'object' || input === null) return null;
  const candidate = (input as { cvId?: unknown }).cvId;
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
}
