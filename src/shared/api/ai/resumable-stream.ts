import { after } from 'next/server';
import type {
  Publisher,
  ResumableStreamContext,
  Subscriber,
} from 'resumable-stream/generic';
import { createResumableStreamContext } from 'resumable-stream/generic';

import { getRedis, isRedisConfigured } from '@/shared/api/redis/redis';
import { logger } from '@/shared/lib/logger';

type UpstashSubscriber = ReturnType<ReturnType<typeof getRedis>['subscribe']>;

let cached: ResumableStreamContext | null = null;

// Upstash's REST `subscribe` transport is line-based: it splits the delivered
// SSE stream on `\n` and only forwards lines beginning with `data: ` to the
// message callback (see @upstash/redis HttpClient event-stream reader). The
// resumable-stream library publishes raw SSE frames whose payloads contain
// `\n\n` separators (and a `DONE_MESSAGE` sentinel that itself starts with
// newlines), so any newline in the payload gets shredded by that transport —
// the backlog frame is lost and the client's SSE parser hangs forever waiting
// for a `\n\n` terminator. base64 has no `\n` (or `,`, which Upstash uses as a
// `type,channel,message` field separator), so encoding on publish and decoding
// on delivery makes arbitrary payloads survive the transport unchanged. The
// encoding is symmetric and fully transparent to resumable-stream: it only ever
// sees the original strings, so its `message === DONE_MESSAGE` comparison and
// `JSON.parse` of the request channel keep working.
function encodePayload(message: string): string {
  return Buffer.from(message, 'utf8').toString('base64');
}

function decodePayload(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf8');
}

function buildPublisher(): Publisher {
  const redis = getRedis();
  return {
    connect: async () => undefined,
    publish: (channel, message) => redis.publish(channel, encodePayload(message)),
    set: (key, value, options) => {
      if (options?.EX != null) {
        return redis.set(key, value, { ex: options.EX }) as Promise<unknown>;
      }
      return redis.set(key, value) as Promise<unknown>;
    },
    get: async (key) => {
      // automaticDeserialization is disabled in the Upstash client, so values
      // come back as raw strings (or null). The Publisher interface expects
      // string | number | null.
      const value = await redis.get<string | null>(key);
      return value;
    },
    incr: (key) => redis.incr(key),
  };
}

function buildSubscriber(): Subscriber {
  const redis = getRedis();
  const subscriptions = new Map<string, UpstashSubscriber>();
  return {
    connect: async () => undefined,
    subscribe: async (channel, callback) => {
      const sub = redis.subscribe<string>(channel);
      sub.on('message', (event) => {
        // automaticDeserialization is disabled, so event.message is the raw
        // (base64-encoded) string published by the producer side. Decode it
        // back to the original SSE frame before handing it to resumable-stream.
        callback(decodePayload(event.message));
      });
      sub.on('error', (err) => {
        logger.error({ err, channel }, 'resumable-stream: redis subscriber error');
      });
      subscriptions.set(channel, sub);
    },
    unsubscribe: async (channel) => {
      const sub = subscriptions.get(channel);
      if (!sub) return;
      try {
        await sub.unsubscribe();
      } catch (err) {
        logger.warn({ err, channel }, 'resumable-stream: failed to unsubscribe cleanly');
      }
      subscriptions.delete(channel);
    },
  };
}

/**
 * Returns the module-cached resumable-stream context, or `null` if Upstash
 * Redis is not configured. Callers that depend on resumption (chat route POST
 * `consumeSseStream`, GET handler) must treat `null` as graceful degradation:
 * POST keeps streaming non-resumably; GET returns 204.
 */
export function getResumableStreamContext(): ResumableStreamContext | null {
  if (cached) return cached;
  if (!isRedisConfigured()) return null;

  cached = createResumableStreamContext({
    waitUntil: after,
    publisher: buildPublisher(),
    subscriber: buildSubscriber(),
  });
  return cached;
}

export function resetResumableStreamCache(): void {
  cached = null;
}

/**
 * Stream id used for resumable chat streams. Scoped per chat session:
 * `chat:${sessionId}`.
 */
export function getChatStreamId(sessionId: string): string {
  return `chat:${sessionId}`;
}
