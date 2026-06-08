const Task = require("../models/Task");
const User = require("../models/User");
const moment = require("moment");
const { cloudinary } = require("../utils/cloudinary");
const fs = require("fs");
const mongoose = require("mongoose");
const {
    getCache,
    setCache,
    deleteCache,
    invalidatePattern,
} = require("../config/redis");
const {
    sendTaskAssignedEmail,
    sendTaskUpdatedEmail,
} = require("../utils/emailService");




//  Helpers

//@desc : Invalidate all task-related caches for a given user.
async function invalidateTaskCaches(userId) {
    await Promise.all([
        invalidatePattern("cache:dashboard:*"),
        invalidatePattern("cache:user-dashboard:*"),
        invalidatePattern("cache:tasks:*"),
        deleteCache("cache:manager-stats"),
    ]);
}


//  getTasks
//  GET /api/tasks/
const getTasks = async (req, res) => {
    try {
        const { status, department, search, createdByMe, assignedToMe } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;

        let filter = {};

        if (status) filter.status = status;

        // Department filter: find user IDs in that department, then filter tasks
        if (department) {
            let usersInDept;
            if (department === "Other") {
                usersInDept = await User.find({
                    $or: [
                        { department: "Other" },
                        { department: "" },
                        { department: null },
                        { department: { $exists: false } },
                        { department: { $nin: ["Management", "HR", "IT", "Technical", "UI/UX", "Marketing", "Sales", "Security"] } }
                    ]
                }).select("_id").lean();
            } else {
                usersInDept = await User.find({ department }).select("_id").lean();
            }
            const userIds = usersInDept.map(u => u._id);
            filter.assignedTo = { $in: userIds };
        }

        if (search) {
            filter.$text = { $search: search };
        }

        if (createdByMe === "true") {
            filter.createdBy = req.user._id || req.user.id;
        }

        if (assignedToMe === "true") {
            filter.assignedTo = req.user._id || req.user.id;
        }

        const isAdminOrManager = req.user.role === "admin" || req.user.role === "manager";

        // Members can only see their own assigned tasks
        if (!isAdminOrManager) {
            if (filter.assignedTo && filter.assignedTo.$in) {
                filter.$and = [
                    { assignedTo: req.user._id },
                    { assignedTo: { $in: filter.assignedTo.$in } }
                ];
                delete filter.assignedTo;
            } else if (!filter.assignedTo) {
                filter.assignedTo = req.user._id;
            }
        }

        const userObjectId = new mongoose.Types.ObjectId(req.user._id || req.user.id);
        const baseMatch = { $match: filter };
        const countFilter = isAdminOrManager ? {} : { assignedTo: userObjectId };

        const [tasksResult, countResult] = await Promise.all([
            Task.find(filter)
                .populate("assignedTo", "name email profileImageUrl department")
                .populate("createdBy", "_id name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Task.aggregate([
                { $match: countFilter },
                {
                    $facet: {
                        all: [{ $count: "count" }],
                        pending: [{ $match: { status: "Pending" } }, { $count: "count" }],
                        inProgress: [{ $match: { status: "In Progress" } }, { $count: "count" }],
                        completed: [{ $match: { status: "Completed" } }, { $count: "count" }]
                    }
                }
            ])
        ]);

        const tasks = tasksResult.map(task => ({
            ...task,
            completedTodoCount: task.todoChecklist
                ? task.todoChecklist.filter(item => item.completed).length
                : 0
        }));

        const counts = countResult[0];
        const statusSummary = {
            all: counts.all[0]?.count || 0,
            pendingTasks: counts.pending[0]?.count || 0,
            inProgressTasks: counts.inProgress[0]?.count || 0,
            completedTasks: counts.completed[0]?.count || 0,
        };

        return res.json({
            success: true,
            tasks,
            statusSummary,
            pagination: {
                page,
                limit,
                total: statusSummary.all,
                totalPages: Math.ceil(statusSummary.all / limit),
                hasNextPage: page * limit < statusSummary.all,
            }
        });

    } catch (error) {
        console.error("[TaskController] getTasks error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch tasks" });
    }
};

//  getTaskById
//  GET /api/tasks/:id
const getTaskById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid task ID" });
        }

        const task = await Task.findById(req.params.id)
            .populate("assignedTo", "name email profileImageUrl")
            .lean();

        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        const userId = (req.user._id || req.user.id).toString();
        const isAssigned = task.assignedTo.some(u => u && u._id.toString() === userId);
        const isCreator = task.createdBy && task.createdBy.toString() === userId;

        if (req.user.role !== "admin" && req.user.role !== "manager" && !isAssigned && !isCreator) {
            return res.status(403).json({ success: false, message: "Forbidden: You don't have access to this task" });
        }

        return res.json({
            success: true,
            ...task,
            completedTodoCount: task.todoChecklist
                ? task.todoChecklist.filter(item => item.completed).length
                : 0
        });

    } catch (error) {
        console.error("[TaskController] getTaskById error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch task" });
    }
};

//  createTask
//  POST /api/tasks/
const createTask = async (req, res) => {
    try {
        let { title, description, priority, dueDate, assignedTo, attachments, todoChecklist } = req.body;

        if (typeof assignedTo === "string") {
            try { assignedTo = JSON.parse(assignedTo); }
            catch { assignedTo = assignedTo.trim().startsWith("[") ? [] : [assignedTo]; }
        }
        if (!Array.isArray(assignedTo)) {
            if (!assignedTo) assignedTo = [];
            else return res.status(400).json({ success: false, message: "assignedTo must be an array of user IDs" });
        }

        // Check if any user is on HOLD
        if (assignedTo.length > 0) {
            const usersOnHold = await User.find({
                _id: { $in: assignedTo },
                isOnHold: true
            }).select("name").lean();

            if (usersOnHold.length > 0) {
                const names = usersOnHold.map(u => u.name).join(", ");
                return res.status(400).json({ success: false, message: `Cannot assign task: User(s) ${names} are on HOLD.` });
            }
        }

        if (typeof todoChecklist === "string") {
            try { todoChecklist = JSON.parse(todoChecklist); }
            catch { todoChecklist = []; }
        }

        let attachmentData = [];

        if (attachments) {
            let links = typeof attachments === "string" ? (() => {
                try { const p = JSON.parse(attachments); return Array.isArray(p) ? p : [attachments]; }
                catch { return [attachments]; }
            })() : attachments;

            if (Array.isArray(links)) {
                links.forEach(link => {
                    if (typeof link === "string") {
                        attachmentData.push({ fileUrl: link, fileType: "link", originalName: link });
                    }
                });
            }
        }

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const result = await cloudinary.uploader.upload(file.path, { resource_type: "auto" });
                    attachmentData.push({
                        fileUrl: result.secure_url,
                        fileType: result.resource_type === "raw"
                            ? (file.mimetype === "application/pdf" ? "pdf" : "doc")
                            : result.resource_type,
                        originalName: file.originalname,
                        publicId: result.public_id,
                    });
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                } catch (uploadError) {
                    console.error("[TaskController] Cloudinary upload error:", uploadError.message);
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                }
            }
        }

        const creatorId = req.user._id || req.user.id;
        const task = await Task.create({
            title, description, priority, dueDate,
            assignedTo, attachments: attachmentData,
            todoChecklist, createdBy: creatorId,
        });

        const Notification = require("../models/Notification");
        const ioSocket = req.app.get("io");

        const assignedUsers = assignedTo.length > 0
            ? await User.find({ _id: { $in: assignedTo } }).select("name email").lean()
            : [];
        const userMap = Object.fromEntries(assignedUsers.map(u => [u._id.toString(), u]));

        for (const userId of assignedTo) {
            const objId = mongoose.Types.ObjectId.isValid(userId) ? userId : null;
            if (objId) {
                // In-app notification
                const notify = new Notification({
                    recipient: objId,
                    type: "TASK_ASSIGNED",
                    message: "A new task has been assigned to you.",
                    task: task._id
                });
                await notify.save();
                if (ioSocket) {
                    ioSocket.to(objId.toString()).emit("new_notification", {
                        _id: notify._id, type: notify.type, message: notify.message,
                        task: { _id: task._id, title: task.title }, isRead: false,
                        createdAt: notify.createdAt
                    });
                }

                // Email notification — fire-and-forget
                const assignedUser = userMap[objId.toString()];
                if (assignedUser?.email) {
                    sendTaskAssignedEmail(assignedUser, task).catch(err =>
                        console.error("[Email] sendTaskAssignedEmail failed:", err.message)
                    );
                }
            }
        }

        invalidateTaskCaches(creatorId).catch(err => console.error("Cache invalidation failed:", err.message));

        return res.status(201).json({ success: true, message: "Task created successfully!", task });

    } catch (error) {
        console.error("[TaskController] createTask error:", error.message);
        res.status(500).json({ success: false, message: "Failed to create task" });
    }
};


//  updateTask
//  PUT /api/tasks/:id
const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const userId = (req.user._id || req.user.id).toString();
        if (req.user.role !== "manager" && task.createdBy.toString() !== userId) {
            return res.status(403).json({ success: false, message: "Access denied. Only the Task Creator or Manager can edit this task." });
        }

        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.priority = req.body.priority || task.priority;
        task.dueDate = req.body.dueDate || task.dueDate;

        if (req.body.todoChecklist) {
            let todoData = req.body.todoChecklist;
            if (typeof todoData === "string") {
                try { todoData = JSON.parse(todoData); } catch { todoData = []; }
            }
            task.todoChecklist = todoData;
        }

        if (req.body.assignedTo) {
            let assignedTo = req.body.assignedTo;
            if (typeof assignedTo === "string") {
                try { assignedTo = JSON.parse(assignedTo); }
                catch { assignedTo = assignedTo.trim().startsWith("[") ? [] : [assignedTo]; }
            }
            if (!Array.isArray(assignedTo)) {
                return res.status(400).json({ success: false, message: "assignedTo must be an array of user IDs" });
            }
            task.assignedTo = assignedTo;
        }

        let newAttachments = task.attachments || [];

        if (req.body.attachments) {
            let inputAttachments = req.body.attachments;
            if (typeof inputAttachments === "string") {
                try { inputAttachments = JSON.parse(inputAttachments); }
                catch { inputAttachments = []; }
            }
            if (Array.isArray(inputAttachments)) {
                newAttachments = inputAttachments.map(item =>
                    typeof item === "string"
                        ? { fileUrl: item, fileType: "link", originalName: item }
                        : item
                );
            }
        }

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const result = await cloudinary.uploader.upload(file.path, { resource_type: "auto" });
                    newAttachments.push({
                        fileUrl: result.secure_url,
                        fileType: result.resource_type === "raw"
                            ? (file.mimetype === "application/pdf" ? "pdf" : "doc")
                            : result.resource_type,
                        originalName: file.originalname,
                        publicId: result.public_id,
                    });
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                } catch (uploadError) {
                    console.error("[TaskController] Cloudinary upload error:", uploadError.message);
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                }
            }
        }

        if (req.body.attachments || (req.files && req.files.length > 0)) {
            task.attachments = newAttachments;
        }

        await task.save();
        const updatedTask = await Task.findById(task._id)
            .populate("assignedTo", "name email profileImageUrl")
            .lean();

        // In-app + email notifications — fire-and-forget
        const Notification = require("../models/Notification");
        const ioSocket = req.app.get("io");
        for (const user of updatedTask.assignedTo) {
            // In-app notification
            const notify = new Notification({
                recipient: user._id,
                type: "TASK_UPDATED",
                message: `Task "${updatedTask.title}" has been updated.`,
                task: updatedTask._id
            });
            await notify.save();
            if (ioSocket) {
                ioSocket.to(user._id.toString()).emit("new_notification", {
                    _id: notify._id, type: notify.type, message: notify.message,
                    task: { _id: updatedTask._id, title: updatedTask.title },
                    isRead: false, createdAt: notify.createdAt
                });
            }

            // Email notification — fire-and-forget
            if (user.email) {
                sendTaskUpdatedEmail(user, updatedTask).catch(err =>
                    console.error("[Email] sendTaskUpdatedEmail failed:", err.message)
                );
            }
        }

        invalidateTaskCaches(userId).catch(err => console.error("Cache invalidation failed:", err.message));
        return res.status(200).json({ success: true, message: "Task updated successfully!", task: updatedTask });

    } catch (error) {
        console.error("[TaskController] updateTask error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update task" });
    }
};


//  updateTaskStatus
//  PUT /api/tasks/:id/status
const updateTaskStatus = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const userId = (req.user._id || req.user.id).toString();
        const isAssigned = task.assignedTo.some(id => id.toString() === userId);
        const isCreator = task.createdBy.toString() === userId;

        if (!isAssigned && !isCreator && req.user.role !== "manager") {
            return res.status(403).json({ success: false, message: "Not authorized to update this task" });
        }

        task.status = req.body.status || task.status;

        if (task.status === "Completed") {
            task.todoChecklist?.forEach(item => { item.completed = true; });
            task.progress = 100;
        } else if (task.status === "In Progress") {
            task.todoChecklist?.forEach(item => { item.completed = false; });
            task.progress = 50;
        } else if (task.status === "Pending") {
            task.todoChecklist?.forEach(item => { item.completed = false; });
            task.progress = 0;
        }

        await task.save();

        // Auto-release hold check
        if (task.status === "Completed" && task.assignedTo.length > 0) {
            for (const assigneeId of task.assignedTo) {
                const user = await User.findById(assigneeId);
                if (user && user.isOnHold) {
                    const pendingCount = await Task.countDocuments({
                        assignedTo: assigneeId,
                        status: { $ne: "Completed" }
                    });
                    if (pendingCount === 0) {
                        user.isOnHold = false;
                        await user.save();
                        await deleteCache(`cache:user:${assigneeId}`);
                    }
                }
            }
        }

        invalidateTaskCaches(userId).catch(err => console.error("Cache invalidation failed:", err.message));
        return res.status(200).json({ success: true, message: "Task status updated successfully!", task });

    } catch (error) {
        console.error("[TaskController] updateTaskStatus error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update task status" });
    }
};


//  deleteTask
//  DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const userId = (req.user._id || req.user.id).toString();
        if (req.user.role !== "manager" && task.createdBy.toString() !== userId) {
            return res.status(403).json({ success: false, message: "Access denied. Only the Task Creator or Manager can delete this task." });
        }

        await task.deleteOne();
        invalidateTaskCaches(userId).catch(err => console.error("Cache invalidation failed:", err.message));

        return res.json({ success: true, message: "Task deleted successfully!" });

    } catch (error) {
        console.error("[TaskController] deleteTask error:", error.message);
        res.status(500).json({ success: false, message: "Failed to delete task" });
    }
};

//  updateTaskChecklist
//  PUT /api/tasks/:id/todo
const updateTaskChecklist = async (req, res) => {
    try {
        const { todoChecklist } = req.body;
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const userId = (req.user._id || req.user.id).toString();
        const isAssigned = task.assignedTo.some(id => id.toString() === userId);
        const isCreator = task.createdBy.toString() === userId;

        if (!isAssigned && !isCreator && req.user.role !== "manager") {
            return res.status(403).json({ success: false, message: "Not authorized to update this task" });
        }

        task.todoChecklist = todoChecklist;
        const completedCount = task.todoChecklist.filter(item => item.completed).length;
        const totalItems = task.todoChecklist.length;
        task.progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

        if (task.progress === 100) task.status = "Completed";
        else if (task.progress > 0) task.status = "In Progress";
        else task.status = "Pending";

        await task.save();
        const updatedTask = await Task.findById(req.params.id)
            .populate("assignedTo", "name email profileImageUrl")
            .lean();

        invalidateTaskCaches(userId).catch(err => console.error("Cache invalidation failed:", err.message));

        return res.json({
            success: true,
            message: "Task checklist updated successfully!",
            task: {
                ...updatedTask,
                completedTodoCount: completedCount
            }
        });

    } catch (error) {
        console.error("[TaskController] updateTaskChecklist error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update checklist" });
    }
};


//  getDashboardData
//  GET /api/tasks/dashboard-data
const getDashboardData = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const userRole = req.user.role;
        const isAdminOrManager = userRole === "admin" || userRole === "manager";

        const cacheKey = `cache:dashboard:${userId}`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const memberMatch = isAdminOrManager ? {} : { assignedTo: userObjectId };

        // Run all aggregations in parallel
        const [
            statsResult,
            taskDistributionRaw,
            taskPriorityLevelsRaw,
            recentTasks,
            last7DaysRaw,
            tasksByDepartmentRaw,
            activeWorkloadRaw,
            topPerformersRaw
        ] = await Promise.all([
            Task.aggregate([
                {
                    $facet: {
                        total: [{ $count: "count" }],
                        pending: [{ $match: { status: "Pending" } }, { $count: "count" }],
                        completed: [{ $match: { status: "Completed" } }, { $count: "count" }],
                        overdue: [
                            { $match: { status: { $ne: "Completed" }, dueDate: { $lt: new Date() } } },
                            { $count: "count" }
                        ]
                    }
                }
            ]),

            // Task distribution by status
            Task.aggregate([
                { $match: { ...memberMatch } },
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),

            Task.aggregate([
                { $match: { ...memberMatch } },
                { $group: { _id: "$priority", count: { $sum: 1 } } }
            ]),

            // Recent tasks
            Task.find()
                .sort({ createdAt: -1 })
                .limit(10)
                .select("title status priority dueDate createdAt")
                .lean(),

            // Last 7 days completed
            Task.aggregate([
                {
                    $match: {
                        status: "Completed",
                        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
                        ...memberMatch
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),

            // Tasks by department
            Task.aggregate([
                { $match: { assignedTo: { $ne: [] } } },
                { $unwind: "$assignedTo" },
                { $lookup: { from: "users", localField: "assignedTo", foreignField: "_id", as: "userDetails" } },
                { $unwind: "$userDetails" },
                { $group: { _id: "$userDetails.department", count: { $sum: 1 } } }
            ]),

            // Active workload by user
            Task.aggregate([
                { $match: { status: { $in: ["Pending", "In Progress"] }, assignedTo: { $ne: [] } } },
                { $unwind: "$assignedTo" },
                { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
                { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "userDetails" } },
                { $unwind: "$userDetails" },
                { $project: { _id: 1, count: 1, name: "$userDetails.name" } }
            ]),

            // Top 5 performers
            Task.aggregate([
                { $match: { status: "Completed", assignedTo: { $ne: [] } } },
                { $unwind: "$assignedTo" },
                { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
                { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "userDetails" } },
                { $unwind: "$userDetails" },
                {
                    $project: {
                        _id: 1, count: 1,
                        name: "$userDetails.name",
                        email: "$userDetails.email",
                        profileImageUrl: "$userDetails.profileImageUrl",
                        department: "$userDetails.department"
                    }
                }
            ])
        ]);

        const stats = statsResult[0];
        const totalTasks = stats.total[0]?.count || 0;


        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistribution = taskStatuses.reduce((acc, s) => {
            acc[s.replace(/\s+/g, "")] = taskDistributionRaw.find(i => i._id === s)?.count || 0;
            return acc;
        }, { All: totalTasks });

        // Format priority levels
        const taskPriorityLevels = ["Low", "Medium", "High"].reduce((acc, p) => {
            acc[p] = taskPriorityLevelsRaw.find(i => i._id === p)?.count || 0;
            return acc;
        }, {});

        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            last7Days.push({
                name: moment(d).format("ddd"),
                date: dateStr,
                count: last7DaysRaw.find(item => item._id === dateStr)?.count || 0
            });
        }

        const tasksByDepartment = tasksByDepartmentRaw.reduce((acc, item) => {
            acc[item._id || "Other"] = item.count;
            return acc;
        }, {});

        const payload = {
            success: true,
            statistics: {
                totalTasks,
                pendingTasks: stats.pending[0]?.count || 0,
                completedTasks: stats.completed[0]?.count || 0,
                overdueTasks: stats.overdue[0]?.count || 0,
            },
            charts: {
                taskDistribution,
                taskPriorityLevels,
                last7Days,
                topPerformers: topPerformersRaw,
                tasksByDepartment,
                activeWorkload: activeWorkloadRaw.map(i => ({ name: i.name, count: i.count }))
            },
            recentTasks,
        };

        await setCache(cacheKey, payload, 120);
        return res.status(200).json(payload);

    } catch (error) {
        console.error("[TaskController] getDashboardData error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch dashboard data" });
    }
};


//  getUserDashboardData
//  GET /api/tasks/user-dashboard-data
const getUserDashboardData = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const cacheKey = `cache:user-dashboard:${userId}`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const userMatch = { assignedTo: userObjectId };

        const [
            statsResult,
            taskDistributionRaw,
            taskPriorityLevelsRaw,
            last7DaysRaw,
            recentTasks
        ] = await Promise.all([
            Task.aggregate([
                { $match: userMatch },
                {
                    $facet: {
                        total: [{ $count: "count" }],
                        pending: [{ $match: { status: "Pending" } }, { $count: "count" }],
                        completed: [{ $match: { status: "Completed" } }, { $count: "count" }],
                        overdue: [
                            { $match: { status: { $ne: "Completed" }, dueDate: { $lt: new Date() } } },
                            { $count: "count" }
                        ]
                    }
                }
            ]),

            Task.aggregate([
                { $match: userMatch },
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),

            Task.aggregate([
                { $match: userMatch },
                { $group: { _id: "$priority", count: { $sum: 1 } } }
            ]),

            Task.aggregate([
                {
                    $match: {
                        assignedTo: userObjectId,
                        status: "Completed",
                        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),

            Task.find({ assignedTo: userId })
                .sort({ createdAt: -1 })
                .limit(10)
                .select("title status priority dueDate createdAt")
                .lean()
        ]);

        const stats = statsResult[0];
        const totalTasks = stats.total[0]?.count || 0;

        const taskDistribution = ["Pending", "In Progress", "Completed"].reduce((acc, s) => {
            acc[s.replace(/\s+/g, "")] = taskDistributionRaw.find(i => i._id === s)?.count || 0;
            return acc;
        }, { All: totalTasks });

        const taskPriorityLevels = ["Low", "Medium", "High"].reduce((acc, p) => {
            acc[p] = taskPriorityLevelsRaw.find(i => i._id === p)?.count || 0;
            return acc;
        }, {});

        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            last7Days.push({
                name: moment(d).format("ddd"),
                date: dateStr,
                count: last7DaysRaw.find(item => item._id === dateStr)?.count || 0
            });
        }

        const payload = {
            success: true,
            statistics: {
                totalTasks,
                pendingTasks: stats.pending[0]?.count || 0,
                completedTasks: stats.completed[0]?.count || 0,
                overdueTasks: stats.overdue[0]?.count || 0,
            },
            charts: { taskDistribution, taskPriorityLevels, last7Days },
            recentTasks,
        };

        await setCache(cacheKey, payload, 120);
        return res.status(200).json(payload);

    } catch (error) {
        console.error("[TaskController] getUserDashboardData error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch user dashboard data" });
    }
};

module.exports = {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    updateTaskChecklist,
    getDashboardData,
    getUserDashboardData
};
