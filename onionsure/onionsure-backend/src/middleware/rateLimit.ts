/**
 * Rate limiting middleware (security audit finding).
 *
 * Protects authentication endpoints from brute-force and token-replay attacks.
 * Uses express-rate-limit with an in-memory store. For multi-instance
 * deployments, swap to a Redis store.
 */
import rateLimit from 'express-rate-limit';

/** Strict limiter for login/refresh — prevents credential brute-force. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 attempts per window per IP
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Stricter limiter for registration — prevents user spam. */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 registrations per hour per IP
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many registration attempts' } },
  standardHeaders: true,
  legacyHeaders: false,
});

/** General API limiter — prevents abuse of any authenticated endpoint. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,            // 200 requests per minute per IP
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' } },
  standardHeaders: true,
  legacyHeaders: false,
});
