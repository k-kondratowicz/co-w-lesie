// Best-effort fixed-window rate limiter, kept in memory. It only counts within a single server
// instance (resets on redeploy/scale-out), so it's a starter guard — swap for Upstash/Redis

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 10_000;

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
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

    windows.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      ok: true,
      retryAfterSeconds: 0,
    };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;

  return {
    ok: true,
    retryAfterSeconds: 0,
  };
}
