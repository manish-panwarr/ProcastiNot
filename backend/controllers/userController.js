const Task = require("../models/Task");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// @desc Get all users (Admin only)
// @route GET /api/users
// @access Private (Admin only)

const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select("-password");

        // add task counts to each user
        const usersWithTaskCounts = await Promise.all(
            users.map(async (user) => {
                const pendingTasks = await Task.countDocuments({
                    assignedTo: user._id,
                    status: "Pending",
                });

                const inProgressTasks = await Task.countDocuments({
                    assignedTo: user._id,
                    status: "In Progress",
                });

                const completedTasks = await Task.countDocuments({
                    assignedTo: user._id,
                    status: "Completed",
                });

                return {
                    ...user._doc,
                    pendingTasks,
                    inProgressTasks,
                    completedTasks,
                };
            })
        );

        res.json(usersWithTaskCounts);

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc Get user by ID 
// @route GET /api/users/:id
// @access Private (Admin only)

const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });

        let tasks = [];
        let adminStats = null;
        let adminsValues = [];

        if (user.role === "admin" || user.role === "manager") {
            tasks = await Task.find({ createdBy: user._id }).populate("assignedTo", "name email");

            const totalCreated = tasks.length;
            const pending = tasks.filter(t => t.status === "Pending").length;
            const inProgress = tasks.filter(t => t.status === "In Progress").length;
            const completed = tasks.filter(t => t.status === "Completed").length;

            // Calculate Rank based on Completed Tasks
            const checkRank = await Task.aggregate([
                { $match: { status: "Completed" } },
                { $group: { _id: "$createdBy", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);

            // Find index of current user in the sorted list
            const rankIndex = checkRank.findIndex(r => r._id.toString() === user._id.toString());
            const rank = rankIndex !== -1 ? rankIndex + 1 : (checkRank.length + 1); // If no completed tasks, rank is last

            adminStats = {
                totalCreated,
                pending,
                inProgress,
                completed,
                rank
            };

        } else {
            tasks = await Task.find({ assignedTo: user._id }).populate("createdBy", "name email");

            const uniqueAdminIds = new Set();

            tasks.forEach(task => {
                if (task.createdBy && !uniqueAdminIds.has(task.createdBy._id.toString())) {
                    uniqueAdminIds.add(task.createdBy._id.toString());
                    adminsValues.push({
                        _id: task.createdBy._id,
                        name: task.createdBy.name,
                        email: task.createdBy.email
                    });
                }
            });
        }

        res.json({ user, tasks, admins: adminsValues, adminStats });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


// @desc Update user (Admin only)
// @route PUT /api/users/:id
// @access Private (Admin only)
const updateUser = async (req, res) => {
    try {
        const { name, email, department, role, isOnHold } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) return res.status(404).json({ message: "User not found" });

        if (role && role !== user.role) {
            // Only Manager can change roles
            if (req.user.role !== "manager") {
                return res.status(403).json({ message: "Only Managers can change user roles" });
            }
            user.role = role;
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.department = department || user.department;
        if (typeof isOnHold !== 'undefined') user.isOnHold = isOnHold;

        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            department: updatedUser.department,
            role: updatedUser.role,
            isOnHold: updatedUser.isOnHold,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }

};


// @desc Delete user (Admin only)
// @route DELETE /api/users/:id
// @access Private (Admin only)

const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) return res.status(404).json({ message: "User not found" });

        // Check permissions
        // Manager can delete anyone
        // Admin can delete only members (not other admins or managers)

        if (req.user.role !== "manager" && (user.role === "admin" || user.role === "manager")) {
            return res.status(403).json({ message: "Access denied. Admins cannot delete other Admins or Managers." });
        }

        await user.deleteOne();
        res.json({ message: "User removed" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc Get Manager Dashboard Stats
// @route GET /api/users/manager-dashboard-stats
// @access Private (Manager only)
const getManagerDashboardStats = async (req, res) => {
    try {
        if (req.user.role !== "manager") {
            return res.status(403).json({ message: "Access denied. Manager only." });
        }

        const totalUsers = await User.countDocuments();
        const totalAdmins = await User.countDocuments({ role: "admin" });
        const totalManagers = await User.countDocuments({ role: "manager" });
        const totalTasks = await Task.countDocuments();
        const completedTasks = await Task.countDocuments({ status: "Completed" });
        const pendingTasks = await Task.countDocuments({ status: "Pending" });
        const inProgressTasks = await Task.countDocuments({ status: "In Progress" });

        // Get All Users with Performance Stats
        const users = await User.find({}).select("-password");

        const userPerformance = await Promise.all(users.map(async (u) => {
            const assignedCount = await Task.countDocuments({ assignedTo: u._id });
            const createdCount = await Task.countDocuments({ createdBy: u._id });
            const completedAssigned = await Task.countDocuments({ assignedTo: u._id, status: "Completed" });

            return {
                _id: u._id,
                name: u.name,
                email: u.email,
                role: u.role,
                profileImageUrl: u.profileImageUrl,
                assignedCount,
                createdCount,
                completedAssigned,
                completionRate: assignedCount > 0 ? Math.round((completedAssigned / assignedCount) * 100) : 0
            };
        }));

        res.json({
            counts: {
                totalUsers,
                totalAdmins,
                totalManagers,
                totalTasks,
                completedTasks,
                pendingTasks,
                inProgressTasks
            },
            userPerformance
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc  Get all users for chat (any authenticated user)
// @route GET /api/users/chat-list
// @access Private (any logged-in user)
const getChatUsers = async (req, res) => {
    try {
        // Return all users except the currently logged-in user
        const users = await User.find({ _id: { $ne: req.user._id } })
            .select("name email role department profileImageUrl")
            .sort({ name: 1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    getManagerDashboardStats,
    getChatUsers
};
