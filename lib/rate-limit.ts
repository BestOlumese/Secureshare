interface RateLimitEntry {
  count: number;
  lastReset: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

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
