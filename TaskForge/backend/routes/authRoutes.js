const express = require("express");
const router = express.Router();

const {
    registerUser,
    loginUser,
    refreshToken,
    logoutUser,
    logoutAllDevices,
    getUserProfile,
    updateUserProfile,
    uploadImage
} = require("../controllers/authController");

const { protect } = require("../middlewares/authMiddleware");
const { authLimiter } = require("../middlewares/rateLimiter");
const upload = require("../middlewares/uploadMiddleware");


//  Auth Routes

// Public
router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);

router.post("/refresh", authLimiter, refreshToken);

// Protected profile routes
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);

// Logout — requires valid access token
router.post("/logout", protect, logoutUser);
router.post("/logout-all", protect, logoutAllDevices);

// Image upload — public (used before auth in registration flow)
router.post("/upload-image", upload.single("image"), uploadImage);

module.exports = router;