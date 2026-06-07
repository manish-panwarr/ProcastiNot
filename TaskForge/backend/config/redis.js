/**
 * @file config/redis.js
 * @desc Pure Upstash Redis implementation using @upstash/redis (REST client).
 *       Replaces ioredis. Stateless client with HTTP fallback logic.
 */

const { Redis } = require("@upstash/redis");

let client = null;
let _isRedisReady = false; // We use a flag to track if initialization succeeded

/**
 * @desc Returns the Upstash Redis client singleton, creating it on first call.
 */
function getRedisClient() {
    if (client) return client;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        console.warn("[Redis] UPSTASH_REDIS_REST_URL or TOKEN not set — Redis disabled.");
        _isRedisReady = false;
        return null;
    }

    try {
        client = new Redis({
            url,
            token,
        });
        
        _isRedisReady = true;
    } catch (err) {
        console.error("[Redis] Initialization error:", err.message);
        _isRedisReady = false;
        client = null;
    }

    return client;
}

/**
 * @desc Startup health check to verify connection via a PING command.
 *       @upstash/redis is HTTP-based, so this performs a real network test.
 */
async function testRedisConnection() {
    const redisClient = getRedisClient();
    if (!redisClient) {
        console.warn("[Redis] Connection test skipped (client disabled).");
        return false;
    }

    try {
        const response = await redisClient.ping();
        if (response === "PONG") {
            console.log("[Redis] Connected successfully to Upstash (REST).");
            _isRedisReady = true;
            return true;
        }
        throw new Error("Unexpected ping response");
    } catch (err) {
        console.error("[Redis] Connection test failed:", err.message);
        _isRedisReady = false;
        return false;
    }
}

/**
 * @desc Checks whether Redis is initialized and passed the health check.
 */
function isRedisReady() {
    return client !== null && _isRedisReady;
}

// ─────────────────────────────────────────────
//  CACHE HELPERS
//  Gracefully return null/false if Redis is down
// ─────────────────────────────────────────────

/**
 * @desc Get a cached value by key.
 */
async function getCache(key) {
    try {
        if (!isRedisReady()) return null;
        // @upstash/redis automatically parses JSON if the stored value is JSON
        const data = await client.get(key);
        return data || null;
    } catch (err) {
        console.error(`[Redis] getCache error for key "${key}":`, err.message);
        return null;
    }
}

/**
 * @desc Set a cache entry with optional TTL (seconds).
 */
async function setCache(key, value, ttlSeconds = 300) {
    try {
        if (!isRedisReady()) return false;
        // @upstash/redis automatically stringifies objects
        // We use the { ex: ttl } options object syntax supported by @upstash/redis
        await client.set(key, value, { ex: ttlSeconds });
        return true;
    } catch (err) {
        console.error(`[Redis] setCache error for key "${key}":`, err.message);
        return false;
    }
}

/**
 * @desc Delete a specific cache key.
 */
async function deleteCache(key) {
    try {
        if (!isRedisReady()) return false;
        await client.del(key);
        return true;
    } catch (err) {
        console.error(`[Redis] deleteCache error for key "${key}":`, err.message);
        return false;
    }
}

/**
 * @desc Check if a key exists in Redis.
 */
async function existsCache(key) {
    try {
        if (!isRedisReady()) return false;
        const count = await client.exists(key);
        return count > 0;
    } catch (err) {
        console.error(`[Redis] existsCache error for key "${key}":`, err.message);
        return false;
    }
}

/**
 * @desc Invalidate cache keys matching a pattern.
 */
async function invalidatePattern(pattern) {
    try {
        if (!isRedisReady()) return false;
        const keys = await client.keys(pattern);
        if (keys && keys.length > 0) {
            await client.del(...keys);
        }
        return true;
    } catch (err) {
        console.error(`[Redis] invalidatePattern error for pattern "${pattern}":`, err.message);
        return false;
    }
}

module.exports = {
    getRedisClient,
    testRedisConnection,
    isRedisReady,
    getCache,
    setCache,
    deleteCache,
    existsCache,
    invalidatePattern,
};

