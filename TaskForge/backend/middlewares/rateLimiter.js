/**
 * @file middlewares/rateLimiter.js
 * @desc Production-grade rate limiters using express-rate-limit + Redis store.
 *       Falls back to in-memory store if Redis is unavailable, so the app never
 *       crashes when Redis is down — it just uses less precise counting.
 *
 * Limiters:
 *   globalLimiter   — 100 req/min per IP (applied to all routes)
 *   authLimiter     — 5 req/min per IP (login, register, refresh, forgot-password)
 *   apiLimiter      — 60 req/min per authenticated user ID
 */

const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { getRedisClient, isRedisReady } = require("../config/redis");
const { ipKeyGenerator } = require("express-rate-limit");

/**
 * @desc Creates a RedisStore for rate-limit if Redis is available.
 *       Returns undefined to fall back to MemoryStore if not.
 * @param {string} prefix  — Redis key prefix to isolate different limiters
 */
function buildStore(prefix) {
    // @upstash/redis does not provide a standard sendCommand/call method required by rate-limit-redis.
    // Since we are using pure Upstash REST client, we gracefully fallback to express-rate-limit's built-in MemoryStore.
    return undefined;
}

/**
 * @desc Standardised 429 response body.
 */
const tooManyRequestsHandler = (req, res) => {
    res.status(429).json({
        success: false,
        message: "Too many requests. Please slow down and try again later.",
    });
};

// ─────────────────────────────────────────────
//  GLOBAL RATE LIMITER
//  100 requests per minute per IP — all routes
// ─────────────────────────────────────────────
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,         // 1 minute window
    max: 100,                     // 100 requests per window
    standardHeaders: "draft-7",   // Return RateLimit-* headers (RFC 9110)
    legacyHeaders: false,
    store: buildStore("rl:global:"),
    handler: tooManyRequestsHandler,
    skip: (req) => req.path === "/health",  // Don't limit health checks
});

// ─────────────────────────────────────────────
//  AUTH RATE LIMITER
//  5 requests per minute per IP — auth endpoints only
// ─────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 60 * 1000,         // 1 minute window
    max: 5,                       // 5 attempts per window
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store: buildStore("rl:auth:"),
    handler: tooManyRequestsHandler,
    // Use built-in ipKeyGenerator — handles IPv4 + IPv6 normalization correctly
    keyGenerator: ipKeyGenerator,
});

// ─────────────────────────────────────────────
//  AUTHENTICATED USER RATE LIMITER
//  60 requests per minute per USER ID — for heavy API endpoints
//  Applied selectively (not globally) to expensive routes.
// ─────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,         // 1 minute window
    max: 60,                      // 60 requests per window per user
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store: buildStore("rl:api:"),
    handler: tooManyRequestsHandler,
    // Key by user ID when authenticated, fallback to IP via express-rate-limit helper
    keyGenerator: (req, res) => {
        return req.user ? `user:${req.user._id}` : ipKeyGenerator(req, res);
    },
    skip: (req) => !req.user,    // Skip if not authenticated (globalLimiter covers it)
});

module.exports = { globalLimiter, authLimiter, apiLimiter };
