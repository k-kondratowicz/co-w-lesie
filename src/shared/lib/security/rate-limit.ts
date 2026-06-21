import { type Duration, Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiting with two backends behind one async API:
//   - Upstash Redis (durable, shared across instances) when UPSTASH_REDIS_REST_* env is set;
//   - otherwise a best-effort in-memory fixed window (per-instance, resets on redeploy).
// So local/dev needs no service, and production uses Upstash just by setting the env vars.

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

// --- in-memory fallback ---------------------------------------------------------------------

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 10_000;

function inMemoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    if (windows.size > MAX_TRACKED_KEYS) {
      for (const [existingKey, window] of windows) {
        if (window.resetAt <= now) {
          windows.delete(existingKey);
        }
      }
    }

    windows.set(key, { count: 1, resetAt: now + windowMs });

    return { ok: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;

  return { ok: true, retryAfterSeconds: 0 };
}

// --- Upstash backend (lazy, only when configured) -------------------------------------------

let redis: Redis | null | undefined;
const limiters = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (redis === undefined) {
    redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;
  }

  return redis;
}

function getLimiter(client: Redis, limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  let limiter = limiters.get(cacheKey);

  if (!limiter) {
    const window = `${Math.round(windowMs / 1000)} s` as Duration;
    limiter = new Ratelimit({ redis: client, limiter: Ratelimit.fixedWindow(limit, window), prefix: 'ratelimit' });
    limiters.set(cacheKey, limiter);
  }

  return limiter;
}

// --- public API -----------------------------------------------------------------------------

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const client = getRedis();

  if (!client) {
    return inMemoryLimit(key, limit, windowMs);
  }

  const { success, reset } = await getLimiter(client, limit, windowMs).limit(key);

  return {
    ok: success,
    retryAfterSeconds: success ? 0 : Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
  };
}
