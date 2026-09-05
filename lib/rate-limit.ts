interface RateLimitEntry {
  count: number;
  lastReset: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Entries are only meaningful for one window. Without eviction the map grows
// for the life of the process, since every unique key stays forever.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const ENTRY_TTL_MS = 60 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.lastReset > ENTRY_TTL_MS) rateLimitMap.delete(key);
  }
}

/**
 * A simple in-memory rate limiter for serverless/edge functions.
 * Note: This will not be perfect in multi-instance environments but 
 * provides significant protection against abuse.
 */
export function rateLimit(key: string, limit: number, windowMs: number): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  const now = Date.now();
  sweep(now);

  const entry = rateLimitMap.get(key) || { count: 0, lastReset: now };

  // Reset window if expired
  if (now - entry.lastReset > windowMs) {
    entry.count = 0;
    entry.lastReset = now;
  }

  entry.count++;
  rateLimitMap.set(key, entry);

  const success = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);
  const reset = entry.lastReset + windowMs;

  return {
    success,
    limit,
    remaining,
    reset,
  };
}

/**
 * Throttles a server action for one user. Server actions are public POST
 * endpoints, so an authenticated caller can otherwise script them — draining
 * the SMTP reputation, the upload quota, or probing the user directory.
 *
 * Throws so callers can just `await limitAction(...)` before doing work.
 */
export function limitAction(
  action: string,
  userId: string,
  limit: number,
  windowMs: number
) {
  const result = rateLimit(`action:${action}:${userId}`, limit, windowMs);
  if (!result.success) {
    const seconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    throw new Error(`Too many requests. Please try again in ${seconds}s.`);
  }
}
