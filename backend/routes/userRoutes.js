const express = require("express");
const { adminOnly, protect } = require("../middlewares/authMiddleware");
const { getUsers, getUserById, deleteUser, updateUser, getManagerDashboardStats, getChatUsers } = require("../controllers/userController");

const router = express.Router();

// User Management Routes
router.get("/", protect, adminOnly, getUsers);                                       // Get all users (Admin only)
router.get("/chat-list", protect, getChatUsers);                                     // Get users for chat (any auth user)
router.get("/manager-dashboard-stats", protect, adminOnly, getManagerDashboardStats); // Manager Dashboard Stats
router.get("/:id", protect, getUserById);                                             // Get user by ID
router.put("/:id", protect, adminOnly, updateUser);                                   // Update user (Admin only)
router.delete("/:id", protect, adminOnly, deleteUser);                                // Delete user (Admin only)

module.exports = router;
