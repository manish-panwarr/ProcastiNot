/**
 * @file controllers/userController.js
 * @desc Production-grade user controller with:
 *   - Aggregation pipelines replacing N+1 query patterns
 *   - Redis caching for expensive read operations
 *   - .lean() on all read queries
 *   - Cache invalidation on writes
 */

const Task = require("../models/Task");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { getCache, setCache, deleteCache, invalidatePattern } = require("../config/redis");

// ─────────────────────────────────────────────
//  getUsers
//  GET /api/users
//  BEFORE: 1 User.find + 3 countDocuments × N users = 1 + 3N DB calls
//  AFTER:  1 aggregation pipeline (always 2 DB operations total)
// ─────────────────────────────────────────────
const getUsers = async (req, res) => {
    try {
        const { role, department, search, paginate, page: qPage, limit: qLimit } = req.query;

        if (paginate === "true") {
            const page = Math.max(1, parseInt(qPage) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(qLimit) || 9));
            const skip = (page - 1) * limit;

            let query = {};
            if (role) {
                query.role = role;
            }
            if (department) {
                if (department === "Other") {
                    query.$or = [
                        { department: "Other" },
                        { department: "" },
                        { department: null },
                        { department: { $exists: false } },
                        { department: { $nin: ["Management", "HR", "IT", "Technical", "UI/UX", "Marketing", "Sales", "Security"] } }
                    ];
                } else {
                    query.department = department;
                }
            }
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { department: { $regex: search, $options: "i" } }
                ];
            }

            const cacheKey = `cache:users:page:${role || 'all'}:${department || 'all'}:${search || 'none'}:${page}:${limit}`;
            const cached = await getCache(cacheKey);
            if (cached) return res.json(cached);

            const total = await User.countDocuments(query);

            const usersWithTaskCounts = await User.aggregate([
                { $match: query },
                { $sort: { name: 1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: "tasks",
                        let: { userId: "$_id" },
                        pipeline: [
                            { $match: { $expr: { $in: ["$$userId", "$assignedTo"] } } },
                            {
                                $group: {
                                    _id: "$status",
                                    count: { $sum: 1 }
                                }
                            }
                        ],
                        as: "taskStats"
                    }
                },
                {
                    $addFields: {
                        pendingTasks: {
                            $ifNull: [
                                { $arrayElemAt: [{ $filter: { input: "$taskStats", as: "t", cond: { $eq: ["$$t._id", "Pending"] } } }, 0] },
                                { _id: "Pending", count: 0 }
                            ]
                        },
                        inProgressTasks: {
                            $ifNull: [
                                { $arrayElemAt: [{ $filter: { input: "$taskStats", as: "t", cond: { $eq: ["$$t._id", "In Progress"] } } }, 0] },
                                { _id: "In Progress", count: 0 }
                            ]
                        },
                        completedTasks: {
                            $ifNull: [
                                { $arrayElemAt: [{ $filter: { input: "$taskStats", as: "t", cond: { $eq: ["$$t._id", "Completed"] } } }, 0] },
                                { _id: "Completed", count: 0 }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        password: 0,
                        __v: 0
                    }
                }
            ]);

            const users = usersWithTaskCounts.map(user => ({
                ...user,
                pendingTasks: user.pendingTasks?.count || 0,
                inProgressTasks: user.inProgressTasks?.count || 0,
                completedTasks: user.completedTasks?.count || 0,
                taskStats: undefined,
            }));

            const payload = {
                success: true,
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                }
            };

            await setCache(cacheKey, payload, 120);
            return res.json(payload);

        } else {
            const cacheKey = "cache:users:all";
            const cached = await getCache(cacheKey);
            if (cached) return res.json(cached);

            const usersWithTaskCounts = await User.aggregate([
                {
                    $lookup: {
                        from: "tasks",
                        let: { userId: "$_id" },
                        pipeline: [
                            { $match: { $expr: { $in: ["$$userId", "$assignedTo"] } } },
                            {
                                $group: {
                                    _id: "$status",
                                    count: { $sum: 1 }
                                }
                            }
                        ],
                        as: "taskStats"
                    }
                },
                {
                    $addFields: {
                        pendingTasks: {
                            $ifNull: [
                                { $arrayElemAt: [{ $filter: { input: "$taskStats", as: "t", cond: { $eq: ["$$t._id", "Pending"] } } }, 0] },
                                { _id: "Pending", count: 0 }
                            ]
                        },
                        inProgressTasks: {
                            $ifNull: [
                                { $arrayElemAt: [{ $filter: { input: "$taskStats", as: "t", cond: { $eq: ["$$t._id", "In Progress"] } } }, 0] },
                                { _id: "In Progress", count: 0 }
                            ]
                        },
                        completedTasks: {
                            $ifNull: [
                                { $arrayElemAt: [{ $filter: { input: "$taskStats", as: "t", cond: { $eq: ["$$t._id", "Completed"] } } }, 0] },
                                { _id: "Completed", count: 0 }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        password: 0,
                        __v: 0
                    }
                }
            ]);

            const result = usersWithTaskCounts.map(user => ({
                ...user,
                pendingTasks: user.pendingTasks?.count || 0,
                inProgressTasks: user.inProgressTasks?.count || 0,
                completedTasks: user.completedTasks?.count || 0,
                taskStats: undefined,
            }));

            await setCache(cacheKey, result, 120);
            return res.json(result);
        }

    } catch (error) {
        console.error("[UserController] getUsers error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
};

// ─────────────────────────────────────────────
//  getUserById
//  GET /api/users/:id
// ─────────────────────────────────────────────
const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        const cacheKey = `cache:user-profile:${userId}`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const user = await User.findById(userId).select("-password -__v").lean();
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        let tasks = [];
        let adminStats = null;
        let adminsValues = [];

        if (user.role === "admin" || user.role === "manager") {
            // Aggregation: get tasks created by this admin + rank in single pipeline
            const [taskResult, rankResult] = await Promise.all([
                Task.find({ createdBy: user._id })
                    .populate("assignedTo", "name email")
                    .lean(),
                Task.aggregate([
                    { $match: { status: "Completed" } },
                    { $group: { _id: "$createdBy", count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ])
            ]);

            tasks = taskResult;
            const rankIndex = rankResult.findIndex(r => r._id.toString() === user._id.toString());
            const rank = rankIndex !== -1 ? rankIndex + 1 : rankResult.length + 1;

            adminStats = {
                totalCreated: tasks.length,
                pending: tasks.filter(t => t.status === "Pending").length,
                inProgress: tasks.filter(t => t.status === "In Progress").length,
                completed: tasks.filter(t => t.status === "Completed").length,
                rank
            };

        } else {
            tasks = await Task.find({ assignedTo: user._id })
                .populate("createdBy", "name email")
                .lean();

            const seen = new Set();
            tasks.forEach(task => {
                if (task.createdBy && !seen.has(task.createdBy._id.toString())) {
                    seen.add(task.createdBy._id.toString());
                    adminsValues.push({
                        _id: task.createdBy._id,
                        name: task.createdBy.name,
                        email: task.createdBy.email
                    });
                }
            });
        }

        const payload = { user, tasks, admins: adminsValues, adminStats };
        await setCache(cacheKey, payload, 180); // Cache 3 minutes
        return res.json(payload);

    } catch (error) {
        console.error("[UserController] getUserById error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch user" });
    }
};

// ─────────────────────────────────────────────
//  updateUser
//  PUT /api/users/:id
// ─────────────────────────────────────────────
const updateUser = async (req, res) => {
    try {
        const { name, email, department, role, isOnHold } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (role && role !== user.role) {
            if (req.user.role !== "manager") {
                return res.status(403).json({ success: false, message: "Only Managers can change user roles" });
            }
            user.role = role;
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.department = department || user.department;

        if (typeof isOnHold !== "undefined") {
            user.isOnHold = isOnHold;
        }

        const updatedUser = await user.save();

        // Invalidate caches for this user
        await Promise.all([
            deleteCache(`cache:user:${updatedUser._id}`),
            deleteCache(`cache:user-profile:${updatedUser._id}`),
            deleteCache("cache:users:all"),
            invalidatePattern("cache:users:page:*")
        ]);

        return res.json({
            success: true,
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            department: updatedUser.department,
            role: updatedUser.role,
            isOnHold: updatedUser.isOnHold,
        });

    } catch (error) {
        console.error("[UserController] updateUser error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update user" });
    }
};

// ─────────────────────────────────────────────
//  deleteUser
//  DELETE /api/users/:id
// ─────────────────────────────────────────────
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (req.user.role !== "manager" && (user.role === "admin" || user.role === "manager")) {
            return res.status(403).json({ success: false, message: "Access denied. Admins cannot delete Admins or Managers." });
        }

        await user.deleteOne();

        // Invalidate caches
        await Promise.all([
            deleteCache(`cache:user:${user._id}`),
            deleteCache(`cache:user-profile:${user._id}`),
            deleteCache("cache:users:all"),
            invalidatePattern("cache:users:page:*")
        ]);

        return res.json({ success: true, message: "User removed" });

    } catch (error) {
        console.error("[UserController] deleteUser error:", error.message);
        res.status(500).json({ success: false, message: "Failed to delete user" });
    }
};

// ─────────────────────────────────────────────
//  getManagerDashboardStats
//  GET /api/users/manager-dashboard-stats
//  BEFORE: 7 countDocuments + 3N countDocuments = 7 + 3N calls
//  AFTER:  3 aggregation pipelines, result cached 2 minutes
// ─────────────────────────────────────────────
const getManagerDashboardStats = async (req, res) => {
    try {
        if (req.user.role !== "manager") {
            return res.status(403).json({ success: false, message: "Access denied. Manager only." });
        }

        const cacheKey = "cache:manager-stats";
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        // Run count aggregations in parallel instead of sequential countDocuments
        const [userCounts, taskCounts, userPerformanceRaw] = await Promise.all([
            // User counts by role in a single aggregation
            User.aggregate([
                {
                    $group: {
                        _id: "$role",
                        count: { $sum: 1 }
                    }
                }
            ]),
            // Task counts by status in a single aggregation
            Task.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]),
            // User performance: assigned + completed + created per user — all in one pipeline
            User.aggregate([
                { $project: { password: 0, __v: 0 } },
                {
                    $lookup: {
                        from: "tasks",
                        let: { uid: "$_id" },
                        pipeline: [
                            { $match: { $expr: { $in: ["$$uid", "$assignedTo"] } } },
                            {
                                $group: {
                                    _id: null,
                                    assigned: { $sum: 1 },
                                    completed: {
                                        $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] }
                                    }
                                }
                            }
                        ],
                        as: "assignedStats"
                    }
                },
                {
                    $lookup: {
                        from: "tasks",
                        let: { uid: "$_id" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$$uid", "$createdBy"] } } },
                            { $count: "count" }
                        ],
                        as: "createdStats"
                    }
                },
                {
                    $project: {
                        name: 1,
                        email: 1,
                        role: 1,
                        profileImageUrl: 1,
                        assignedCount: { $ifNull: [{ $arrayElemAt: ["$assignedStats.assigned", 0] }, 0] },
                        completedAssigned: { $ifNull: [{ $arrayElemAt: ["$assignedStats.completed", 0] }, 0] },
                        createdCount: { $ifNull: [{ $arrayElemAt: ["$createdStats.count", 0] }, 0] }
                    }
                }
            ])
        ]);

        // Map user count aggregation results
        const userCountMap = userCounts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        // Map task count aggregation results
        const taskCountMap = taskCounts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        const userPerformance = userPerformanceRaw.map(u => ({
            ...u,
            completionRate: u.assignedCount > 0
                ? Math.round((u.completedAssigned / u.assignedCount) * 100)
                : 0
        }));

        const payload = {
            success: true,
            counts: {
                totalUsers: userCounts.reduce((s, i) => s + i.count, 0),
                totalAdmins: userCountMap["admin"] || 0,
                totalManagers: userCountMap["manager"] || 0,
                totalMembers: userCountMap["member"] || 0,
                totalTasks: taskCounts.reduce((s, i) => s + i.count, 0),
                completedTasks: taskCountMap["Completed"] || 0,
                pendingTasks: taskCountMap["Pending"] || 0,
                inProgressTasks: taskCountMap["In Progress"] || 0,
            },
            userPerformance
        };

        await setCache(cacheKey, payload, 120); // Cache 2 minutes
        return res.json(payload);

    } catch (error) {
        console.error("[UserController] getManagerDashboardStats error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch manager stats" });
    }
};

// ─────────────────────────────────────────────
//  getChatUsers
//  GET /api/users/chat-list
// ─────────────────────────────────────────────
const getChatUsers = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const cacheKey = `cache:chat-users:${userId}`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const users = await User.find({ _id: { $ne: userId } })
            .select("name email role department profileImageUrl")
            .sort({ name: 1 })
            .lean();

        await setCache(cacheKey, users, 300); // Cache 5 minutes
        return res.json(users);

    } catch (error) {
        console.error("[UserController] getChatUsers error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch chat users" });
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
