const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { getRedisClient, isRedisReady } = require("../config/redis");
const { ipKeyGenerator } = require("express-rate-limit");

//@desc : build store for rate limiter
function buildStore(prefix) {
    return undefined;
}

//@desc : Standardised 429 response body.
const tooManyRequestsHandler = (req, res) => {
    res.status(429).json({
        success: false,
        message: "Too many requests. Please slow down and try again later.",
    });
};


//  GLOBAL RATE LIMITER
//  100 requests per minute per IP — all routes
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,         // 1 minute window
    max: 100,                     // 100 requests per window
    standardHeaders: "draft-7",   // Return RateLimit
    legacyHeaders: false,
    store: buildStore("rl:global:"),
    handler: tooManyRequestsHandler,
    skip: (req) => req.path === "/health",  // Don't limit health checks
});


//  AUTH RATE LIMITER
//  5 requests per minute per IP — auth endpoints only
const authLimiter = rateLimit({
    windowMs: 60 * 1000,         // 1 minute window
    max: 5,                       // 5 attempts per window
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store: buildStore("rl:auth:"),
    handler: tooManyRequestsHandler,
    keyGenerator: ipKeyGenerator,
});

//@desc : api Limiter 
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,         // 1 minute window
    max: 60,                      // 60 requests per window per user
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store: buildStore("rl:api:"),
    handler: tooManyRequestsHandler,
    keyGenerator: (req, res) => {
        return req.user ? `user:${req.user._id}` : ipKeyGenerator(req, res);
    },
    skip: (req) => !req.user,
});

module.exports = { globalLimiter, authLimiter, apiLimiter };
