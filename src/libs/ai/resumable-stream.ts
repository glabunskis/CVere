import { after } from 'next/server';
import type {
  Publisher,
  ResumableStreamContext,
  Subscriber,
} from 'resumable-stream/generic';
import { createResumableStreamContext } from 'resumable-stream/generic';

import { logger } from '@/libs/logger';
import { getRedis, isRedisConfigured } from '@/libs/redis/redis';

type UpstashSubscriber = ReturnType<ReturnType<typeof getRedis>['subscribe']>;

let cached: ResumableStreamContext | null = null;

function buildPublisher(): Publisher {
  const redis = getRedis();
  return {
    connect: async () => undefined,
    publish: (channel, message) => redis.publish(channel, message),
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
        // string published by the producer side.
        callback(event.message);
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
 * Stream id used for the singleton chat session per user. The chat route
 * (POST + GET) and the client (`useChat`) all derive the id the same way:
 * `chat:${user.id}`.
 */
export function getChatStreamId(userId: string): string {
  return `chat:${userId}`;
}
