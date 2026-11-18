import redis from "../config/redis.js";

/**
 * Creates a rate limiting middleware backed by Redis.
 * Falls open safely if Redis is unreachable.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 min)
 * @param {number} options.max - Max allowed requests in window
 * @param {string} options.keyPrefix - Prefix for Redis key
 * @param {string} options.message - Error message when rate limit is exceeded
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 10,
  keyPrefix = "rl",
  message = "Too many requests, please try again later."
} = {}) => {
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req, res, next) => {
    try {
      const ip =
        req.ip ||
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        "unknown";

      const key = `${keyPrefix}:${ip}`;

      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      const ttl = await redis.ttl(key);
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - current));
      res.setHeader("X-RateLimit-Reset", ttl > 0 ? ttl : windowSeconds);

      if (current > max) {
        return res.status(429).json({
          success: false,
          message
        });
      }

      next();
    } catch (error) {
      // Fail-open: do not block legitimate requests if Redis has a transient error
      console.warn("Rate limiter warning (bypassed):", error.message);
      next();
    }
  };
};

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: "rl:auth",
  message: "Too many login attempts. Please try again in 15 minutes."
});

export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: "rl:pwd_reset",
  message: "Too many password reset requests. Please try again in 15 minutes."
});

export default {
  createRateLimiter,
  authRateLimiter,
  passwordResetRateLimiter
};
