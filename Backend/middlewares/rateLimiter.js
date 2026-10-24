/**
 * In-memory token bucket rate limiter middleware (no external dependencies).
 * Tracks tokens per userId (falling back to client IP).
 */

class TokenBucket {
  constructor(capacity, refillIntervalMs) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillIntervalMs = refillIntervalMs;
    this.lastRefill = Date.now();
  }

  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed >= this.refillIntervalMs) {
      const tokensToAdd = Math.floor(elapsed / this.refillIntervalMs);
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  consume(tokens = 1) {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }
}

export const createRateLimiter = ({
  capacity = 10,
  refillIntervalMs = 1000,
  message = "Too many requests. Please slow down.",
  cleanupIntervalMs = 5 * 60 * 1000
} = {}) => {
  const buckets = new Map();

  // Periodic cleanup of idle buckets to avoid memory leaks
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.lastRefill > cleanupIntervalMs) {
        buckets.delete(key);
      }
    }
  }, cleanupIntervalMs);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req, res, next) => {
    const key = req.userId || req.ip || "global";
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = new TokenBucket(capacity, refillIntervalMs);
      buckets.set(key, bucket);
    }

    if (bucket.consume(1)) {
      next();
    } else {
      return res.status(429).json({ message });
    }
  };
};

/**
 * Rate limiter for joining batches (max 5 join attempts per minute per user)
 */
export const batchJoinLimiter = createRateLimiter({
  capacity: 5,
  refillIntervalMs: 12000, // 1 token every 12s -> 5 per minute
  message: "Too many batch join requests. Please wait a moment."
});

/**
 * Rate limiter for group cart item updates (max 30 debounced item updates per minute per user)
 */
export const groupCartItemsLimiter = createRateLimiter({
  capacity: 30,
  refillIntervalMs: 2000, // 1 token every 2s -> 30 per minute
  message: "Too many item updates. Please wait a moment."
});
