import { Redis } from '@upstash/redis';

let cached: Redis | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

export function getRedis(): Redis {
  if (cached) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    throw new Error(
      'Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.',
    );
  }

  // automaticDeserialization is disabled because the resumable-stream library
  // round-trips raw strings (SSE chunks and JSON-encoded control messages)
  // through the Redis Publisher/Subscriber. Letting Upstash JSON.parse them
  // would corrupt the chunks and re-stringifying inside the adapters wastes
  // CPU on every message.
  cached = new Redis({ url, token, automaticDeserialization: false });
  return cached;
}

export function resetRedisCache(): void {
  cached = null;
}
