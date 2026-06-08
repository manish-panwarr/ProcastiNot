const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const {
    setCache,
    getCache,
    deleteCache,
    setWithExpiry,
    existsCache,
    invalidatePattern,
} = require("../config/redis");
const { uploadToCloudinary } = require("../utils/cloudinary");


//  TOKEN CONSTANTS
const ACCESS_TOKEN_EXPIRY = "15m";                    // Short-lived — requires refresh
const REFRESH_TOKEN_EXPIRY = "7d";                    // Long-lived — stored in Redis
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 3600;  // 604800 seconds

//  TOKEN GENERATORS

// @desc : Generates a short-lived JWT access token.
const generateAccessToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
};

// @desc : Generates a long-lived JWT refresh token.
const generateRefreshToken = (userId, deviceId) => {
    return jwt.sign(
        { id: userId, deviceId, jti: uuidv4() },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
};

// @desc : Stores the refresh token in Redis.
const storeRefreshToken = async (userId, deviceId, token) => {
    const key = `refresh:${userId}:${deviceId}`;
    await setCache(key, token, REFRESH_TOKEN_EXPIRY_SECONDS);
};

// @desc : Builds the standardised user response payload (no password, no internals).
const buildUserPayload = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileImageUrl: user.profileImageUrl,
    department: user.department,
});

// @desc : Sets the refresh token as an HttpOnly cookie.
const setRefreshCookie = (res, token) => {
    res.cookie("refreshToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        maxAge: REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
        path: "/api/auth",
    });
};


// REGISTER

// POST /api/auth/register
const registerUser = async (req, res) => {
    try {
        const { name, email, password, profileImageUrl, adminInviteToken, managerToken } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email and password are required" });
        }

        const userExists = await User.findOne({ email }).lean();
        if (userExists) {
            return res.status(400).json({ success: false, message: "Registration failed. Check your details." });
        }

        let role = "member";
        if (adminInviteToken && adminInviteToken === process.env.ADMIN_INVITE_TOKEN) {
            role = "admin";
        }
        if (managerToken && managerToken === process.env.MANAGER_TOKEN) {
            role = "manager";
        }

        const salt = await bcrypt.genSalt(12);  // Increased from 10 to 12
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            profileImageUrl,
            role
        });

        // Issue tokens
        const deviceId = uuidv4();
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id, deviceId);
        await storeRefreshToken(user._id, deviceId, refreshToken);

        setRefreshCookie(res, refreshToken);

        // Invalidate users list cache
        await Promise.all([
            deleteCache("cache:users:all"),
            invalidatePattern("cache:users:page:*"),
        ]).catch(err => console.error("Register cache invalidation error:", err.message));

        return res.status(201).json({
            success: true,
            ...buildUserPayload(user),
            accessToken,
            deviceId,
        });

    } catch (error) {
        console.error("[Auth] Register error:", error.message);
        res.status(500).json({ success: false, message: "Registration failed. Please try again." });
    }
};


//  LOGIN
//  POST /api/auth/login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Issue tokens
        const deviceId = uuidv4();
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id, deviceId);
        await storeRefreshToken(user._id, deviceId, refreshToken);

        setRefreshCookie(res, refreshToken);

        return res.json({
            success: true,
            ...buildUserPayload(user),
            accessToken,
            deviceId,
        });

    } catch (error) {
        console.error("[Auth] Login error:", error.message);
        res.status(500).json({ success: false, message: "Login failed. Please try again." });
    }
};


//  REFRESH TOKEN
//  POST /api/auth/refresh
const refreshToken = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        const deviceId = req.body?.deviceId || req.headers["x-device-id"];

        if (!token) {
            return res.status(401).json({ success: false, message: "Refresh token missing" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        } catch (err) {
            return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
        }

        const { id: userId, deviceId: tokenDeviceId } = decoded;
        const resolvedDeviceId = deviceId || tokenDeviceId;

        if (!resolvedDeviceId) {
            return res.status(401).json({ success: false, message: "Device ID missing" });
        }

        const storeKey = `refresh:${userId}:${resolvedDeviceId}`;
        const storedToken = await getCache(storeKey);

        if (!storedToken || storedToken !== token) {
            return res.status(401).json({ success: false, message: "Refresh token is invalid or has been rotated" });
        }

        await deleteCache(storeKey);

        const newAccessToken = generateAccessToken(userId);
        const newRefreshToken = generateRefreshToken(userId, resolvedDeviceId);
        await storeRefreshToken(userId, resolvedDeviceId, newRefreshToken);

        setRefreshCookie(res, newRefreshToken);

        return res.json({
            success: true,
            accessToken: newAccessToken,
        });

    } catch (error) {
        console.error("[Auth] Refresh error:", error.message);
        res.status(500).json({ success: false, message: "Token refresh failed" });
    }
};


//  LOGOUT
//  POST /api/auth/logout
const logoutUser = async (req, res) => {
    try {
        const deviceId = req.body?.deviceId || req.headers["x-device-id"];
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const accessToken = authHeader.split(" ")[1];

            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
                const expiresAt = decoded.exp;
                const blacklistKey = `blacklist:${accessToken}`;
                await setWithExpiry(blacklistKey, "1", expiresAt);
            } catch {
            }
        }
        if (req.user && deviceId) {
            const storeKey = `refresh:${req.user._id}:${deviceId}`;
            await deleteCache(storeKey);
        }
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
            path: "/api/auth",
        });

        if (req.user) {
            await deleteCache(`cache:user:${req.user._id}`);
        }

        return res.json({ success: true, message: "Logged out successfully" });

    } catch (error) {
        console.error("[Auth] Logout error:", error.message);
        res.status(500).json({ success: false, message: "Logout failed" });
    }
};


//  LOGOUT ALL DEVICES
//  POST /api/auth/logout-all
const logoutAllDevices = async (req, res) => {
    try {
        const { invalidatePattern } = require("../config/redis");
        const deleted = await invalidatePattern(`refresh:${req.user._id}:*`);
        await deleteCache(`cache:user:${req.user._id}`);
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
            path: "/api/auth",
        });

        return res.json({
            success: true,
            message: `Logged out from all devices (${deleted} sessions terminated)`,
        });

    } catch (error) {
        console.error("[Auth] LogoutAll error:", error.message);
        res.status(500).json({ success: false, message: "Logout failed" });
    }
};

//  GET PROFILE
//  GET /api/auth/profile
const getUserProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.json({ success: true, ...req.user });
    } catch (error) {
        console.error("[Auth] GetProfile error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch profile" });
    }
};


//  UPDATE PROFILE
//  PUT /api/auth/profile
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id || req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.profileImageUrl = req.body.profileImageUrl || user.profileImageUrl;
        user.department = req.body.department || user.department;
        user.bio = req.body.bio || user.bio;
        user.mobile = req.body.mobile || user.mobile;

        if (req.body.password) {
            const salt = await bcrypt.genSalt(12);
            user.password = await bcrypt.hash(req.body.password, salt);
        }

        const updatedUser = await user.save();
        await Promise.all([
            deleteCache(`cache:user:${updatedUser._id}`),
            deleteCache("cache:users:all"),
            invalidatePattern("cache:users:page:*"),
        ]).catch(err => console.error("Profile update cache invalidation error:", err.message));
        const accessToken = generateAccessToken(updatedUser._id);

        return res.json({
            success: true,
            ...buildUserPayload(updatedUser),
            accessToken,
        });

    } catch (error) {
        console.error("[Auth] UpdateProfile error:", error.message);
        res.status(500).json({ success: false, message: "Profile update failed" });
    }
};


//  UPLOAD IMAGE
//  POST /api/auth/upload-image
const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }

        const result = await uploadToCloudinary(
            req.file.buffer,
            "task-manager-profiles",
            "auto",
            req.file.mimetype
        );

        return res.status(200).json({
            success: true,
            message: "Profile image uploaded successfully",
            imageUrl: result.secure_url,
            profileImageUrl: result.secure_url,
        });

    } catch (error) {
        console.error("[Auth] UploadImage error:", error.message);
        res.status(500).json({ success: false, message: "Upload failed" });
    }
};

module.exports = {
    registerUser,
    loginUser,
    refreshToken,
    logoutUser,
    logoutAllDevices,
    getUserProfile,
    updateUserProfile,
    uploadImage,
};
