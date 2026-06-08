const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getCache, setCache, existsCache } = require("../config/redis");


//  protect
//  Validates JWT access token, checks blacklist, caches user.

const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        } else if (req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return res.status(401).json({ success: false, message: "Not authorized, no token" });
        }

        // Verify signature and expiry
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({ success: false, message: "Token expired", code: "TOKEN_EXPIRED" });
            }
            return res.status(401).json({ success: false, message: "Invalid token" });
        }

        // Check Redis blacklist — token revoked at logout?
        const blacklistKey = `blacklist:${token}`;
        const isBlacklisted = await existsCache(blacklistKey);
        if (isBlacklisted) {
            return res.status(401).json({ success: false, message: "Token has been revoked. Please log in again." });
        }

        // Try to serve user from Redis cache to skip MongoDB
        const cacheKey = `cache:user:${decoded.id}`;
        let user = await getCache(cacheKey);

        if (!user) {
            // Cache miss — hit MongoDB and populate cache
            user = await User.findById(decoded.id).select("-password").lean();

            if (!user) {
                return res.status(401).json({ success: false, message: "User not found" });
            }

            // Cache for 5 minutes — invalidated on profile update/delete
            await setCache(cacheKey, user, 300);
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("[Auth Middleware] Error:", error.message);
        res.status(401).json({ success: false, message: "Not authorized" });
    }
};


//  adminOnly
//  Requires admin or manager role
const adminOnly = (req, res, next) => {
    if (req.user && (req.user.role === "admin" || req.user.role === "manager")) {
        return next();
    }
    res.status(403).json({ success: false, message: "Access denied. Admin or Manager role required." });
};

//  managerOnly
//  Requires manager role specifically
const managerOnly = (req, res, next) => {
    if (req.user && req.user.role === "manager") {
        return next();
    }
    res.status(403).json({ success: false, message: "Access denied. Manager role required." });
};

module.exports = { protect, adminOnly, managerOnly };
