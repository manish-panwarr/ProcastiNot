const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    updateTaskChecklist,
    getDashboardData,
    getUserDashboardData
} = require("../controllers/taskController");
const { upload } = require("../utils/cloudinary");

const router = express.Router();

// Task Management Routes

router.get("/dashboard-data", protect, getDashboardData);
router.get("/user-dashboard-data", protect, getUserDashboardData);
router.get("/", protect, getTasks); // Get all tasks (Admin : all, User : Asssigned tasks only)
router.get("/:id", protect, getTaskById); // Get task by Id
router.post("/", protect, adminOnly, upload.array("attachments"), createTask); // Create a task (Admin only)
router.put("/:id", protect, upload.array("attachments"), updateTask); // Update a task (Admin only)
router.put("/:id/status", protect, updateTaskStatus); // Update task status (Admin & Assigned User)
router.delete("/:id", protect, adminOnly, deleteTask); // Delete a task (Admin only)
router.put("/:id/todo", protect, updateTaskChecklist);// update task checklist

module.exports = router;