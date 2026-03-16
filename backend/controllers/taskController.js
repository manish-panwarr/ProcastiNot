const Task = require("../models/Task");
const User = require("../models/User");
const moment = require("moment");
const { cloudinary } = require("../utils/cloudinary");
const fs = require("fs");
const mongoose = require("mongoose");

// @desc Get all tasks (Admin : all, User : only assigned tasks)
// @route Get /api/tasks/
// @access Private

const getTasks = async (req, res) => {
    try {
        const { status, department, search } = req.query;
        let filter = {};

        if (status) {
            filter.status = status;
        }

        // Filter by Department (Find users in dept, then filter tasks assigned to them)
        if (department) {
            const usersInDept = await User.find({ department });
            const userIds = usersInDept.map(user => user._id);
            filter.assignedTo = { $in: userIds };
        }

        // Search (Title, Description, Todo Items)
        if (search) {
            const searchRegex = new RegExp(search, "i");
            filter.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { "todoChecklist.text": searchRegex }
            ];
        }

        // Filter by Created By (Admin only feature, to see own tasks)
        if (req.query.createdByMe === "true") {
            filter.createdBy = req.user._id;
        }

        // Filter by Assigned To Me (Admins/Managers to see their own assigned tasks)
        if (req.query.assignedToMe === "true") {
            filter.assignedTo = req.user._id;
        }


        let tasks;

        if (req.user.role == "admin" || req.user.role == "manager") {
            tasks = await Task.find(filter)
                .populate("assignedTo", "name email profileImageUrl department")
                .populate("createdBy", "_id name")
                .sort({ createdAt: -1 });
        } else {
            let query = { ...filter };

            if (query.assignedTo) {
                query.$and = [
                    { assignedTo: req.user._id },
                    { assignedTo: query.assignedTo }
                ];
                delete query.assignedTo;

            } else {
                query.assignedTo = req.user._id;
            }

            tasks = await Task.find(query)
                .populate("assignedTo", "name email profileImageUrl department")
                .populate("createdBy", "_id name")
                .sort({ createdAt: -1 });
        }

        tasks = await Promise.all(
            tasks.map(async (task) => {
                const completedCount = task.todoChecklist.filter((item) => item.completed).length;
                return {
                    ...task._doc,
                    completedTodoCount: completedCount
                };
            })
        );

        const alltasks = await Task.countDocuments(
            (req.user.role == "admin" || req.user.role == "manager") ? {} : { assignedTo: req.user._id }
        );

        const pendingTasks = await Task.countDocuments({
            status: "Pending",
            ...((req.user.role != "admin" && req.user.role != "manager") && { assignedTo: req.user._id }),
        });

        const inProgressTasks = await Task.countDocuments({
            status: "In Progress",
            ...((req.user.role != "admin" && req.user.role != "manager") && { assignedTo: req.user._id }),
        });

        const completedTasks = await Task.countDocuments({
            status: "Completed",
            ...((req.user.role !== "admin" && req.user.role != "manager") && { assignedTo: req.user._id }),
        });

        res.json({
            tasks,
            statusSummary: {
                all: alltasks,
                pendingTasks,
                inProgressTasks,
                completedTasks,
            },
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


// @desc Get task by ID 
// @route Get /api/tasks/:id
// @access Private

const getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).populate(
            "assignedTo",
            "name email profileImageUrl"
        );

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const isAssigned = task.assignedTo.some(
            (user) => user && user._id.toString() === req.user._id.toString()
        );
        const isCreator = task.createdBy && task.createdBy.toString() === req.user._id.toString();

        // Admins and managers can view any task
        // Members can only view tasks assigned to them or created by them
        if (req.user.role !== "admin" && req.user.role !== "manager" && !isAssigned && !isCreator) {
            return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
        }

        const completedCount = task.todoChecklist.filter((item) => item.completed).length;

        res.json({
            ...task._doc,
            completedTodoCount: completedCount
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


// @desc Create a task
// @route POST /api/tasks/
// @access Private

const createTask = async (req, res) => {
    try {
        let { title, description, priority, dueDate, assignedTo, attachments, todoChecklist } = req.body;

        if (typeof assignedTo === "string") {
            try {
                assignedTo = JSON.parse(assignedTo);
            } catch (error) {
                if (assignedTo.trim().startsWith("[")) {
                    assignedTo = [];
                } else {
                    assignedTo = [assignedTo];
                }
            }
        }

        if (!Array.isArray(assignedTo)) {
            if (!assignedTo) assignedTo = [];
            else return res.status(400).json({ message: "assignedTo must be an array of user IDs" });
        }

        // Check if any user is on HOLD
        if (assignedTo.length > 0) {
            const usersOnHold = await User.find({
                _id: { $in: assignedTo },
                isOnHold: true
            });

            if (usersOnHold.length > 0) {
                const names = usersOnHold.map(u => u.name).join(", ");
                return res.status(400).json({ message: `Cannot assign task: User(s) ${names} are on HOLD.` });
            }
        }

        if (typeof todoChecklist === "string") {
            try {
                todoChecklist = JSON.parse(todoChecklist);
            } catch (error) {
                todoChecklist = [];
            }
        }

        let attachmentData = [];

        if (attachments) {
            let links = attachments;
            if (typeof links === "string") {
                try {
                    const parsed = JSON.parse(links);
                    if (Array.isArray(parsed)) links = parsed;
                    else links = [links];
                } catch (e) {
                    links = [links];
                }
            }

            if (Array.isArray(links)) {
                links.forEach((link) => {
                    if (typeof link === "string") {
                        attachmentData.push({
                            fileUrl: link,
                            fileType: "link",
                            originalName: link,
                        });
                    }
                });
            }
        }

        // Handle File Uploads
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const result = await cloudinary.uploader.upload(file.path, {
                        resource_type: "auto",
                    });

                    attachmentData.push({
                        fileUrl: result.secure_url,
                        fileType: result.resource_type === "raw" ? (file.mimetype === "application/pdf" ? "pdf" : "doc") : result.resource_type,
                        originalName: file.originalname,
                        publicId: result.public_id,
                    });

                    // Remove file from local server
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                } catch (uploadError) {
                    console.error("Cloudinary Upload Error:", uploadError);
                    // Try to clean up local file if upload fails
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                }
            }
        }

        const task = await Task.create({
            title,
            description,
            priority,
            dueDate,
            assignedTo,
            attachments: attachmentData,
            todoChecklist,
            createdBy: req.user.id,
        });

        // NOTIFICATIONS & WEBSOCKETS    
        const Notification = require("../models/Notification");
        for (const userId of assignedTo) {
            const objId = mongoose.Types.ObjectId.isValid(userId) ? userId : null;
            if (objId) {
                const notify = new Notification({
                    recipient: objId,
                    type: "TASK_ASSIGNED",
                    message: "A new task has been assigned to you.",
                    task: task._id
                });
                await notify.save();

                // Emit Real-Time Socket Event
                const ioSocket = req.app.get("io");
                if (ioSocket) {
                    ioSocket.to(objId.toString()).emit("new_notification", {
                        _id: notify._id,
                        type: notify.type,
                        message: notify.message,
                        task: { _id: task._id, title: task.title },
                        isRead: false,
                        createdAt: notify.createdAt
                    });
                }
            }
        }

        res.status(201).json({ message: "Task created Successfully !", task });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc Update a task
// @route PUT /api/tasks/:id
// @access Private

const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: "Task not found" });

        // Check if user is Manager OR Creator
        // Admin can only edit if they are the creator (or if they are a manager)
        if (req.user.role !== "manager" && task.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied. Only the Task Creator or Manager can edit this task." });
        }

        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.priority = req.body.priority || task.priority;
        task.dueDate = req.body.dueDate || task.dueDate;

        // Handle todoChecklist update (Parsing)
        if (req.body.todoChecklist) {
            let todoData = req.body.todoChecklist;
            if (typeof todoData === "string") {
                try {
                    todoData = JSON.parse(todoData);
                } catch (e) {
                    todoData = [];
                }
            }
            task.todoChecklist = todoData;
        }

        if (req.body.assignedTo) {
            let assignedTo = req.body.assignedTo;
            if (typeof assignedTo === "string") {
                try {
                    assignedTo = JSON.parse(assignedTo);
                } catch (e) {
                    if (assignedTo.trim().startsWith("[")) assignedTo = [];
                    else assignedTo = [assignedTo];
                }
            }
            if (!Array.isArray(assignedTo)) {
                return res.status(400).json({ message: "assignedTo must be an array of user IDs" });
            }
            task.assignedTo = assignedTo;
        }

        let newAttachments = task.attachments || [];


        if (req.body.attachments) {
            let inputAttachments = req.body.attachments;
            if (typeof inputAttachments === "string") {
                try {
                    inputAttachments = JSON.parse(inputAttachments);
                } catch (e) {
                    inputAttachments = []; // or parse err
                }
            }

            let processedAttachments = [];
            if (Array.isArray(inputAttachments)) {
                inputAttachments.forEach(item => {
                    if (typeof item === 'string') {
                        processedAttachments.push({
                            fileUrl: item,
                            fileType: "link",
                            originalName: item,
                        });
                    } else if (typeof item === 'object') {
                        processedAttachments.push(item);
                    }
                });
            }
            newAttachments = processedAttachments;
        }

        // Handle New File Uploads (Append to list)
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const result = await cloudinary.uploader.upload(file.path, {
                        resource_type: "auto",
                    });

                    newAttachments.push({
                        fileUrl: result.secure_url,
                        fileType: result.resource_type === "raw" ? (file.mimetype === "application/pdf" ? "pdf" : "doc") : result.resource_type,
                        originalName: file.originalname,
                        publicId: result.public_id,
                    });

                    // Remove file from local server
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                } catch (uploadError) {
                    console.error("Cloudinary Upload Error:", uploadError);
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                }
            }
        }

        if (req.body.attachments || (req.files && req.files.length > 0)) {
            task.attachments = newAttachments;
        }


        await task.save();
        const updatedTask = await Task.findById(task._id).populate("assignedTo", "name email profileImageUrl");

        // NOTIFICATIONS & WEBSOCKETS 
        const Notification = require("../models/Notification");
        for (const user of updatedTask.assignedTo) {
            const objId = user._id;
            if (objId) {
                const notify = new Notification({
                    recipient: objId,
                    type: "TASK_UPDATED",
                    message: `Task "${updatedTask.title}" has been updated.`,
                    task: updatedTask._id
                });
                await notify.save();

                const ioSocket = req.app.get("io");
                if (ioSocket) {
                    ioSocket.to(objId.toString()).emit("new_notification", {
                        _id: notify._id,
                        type: notify.type,
                        message: notify.message,
                        task: { _id: updatedTask._id, title: updatedTask.title },
                        isRead: false,
                        createdAt: notify.createdAt
                    });
                }
            }
        }

        res.status(200).json({ message: "Task updated successfully!", task: updatedTask });
    } catch (error) {
        console.log("Update Task Error: ", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc Update task status
// @route PUT /api/tasks/:id/status
// @access Private

const updateTaskStatus = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        // console.log("Task AssignedTo:", task.assignedTo);
        // console.log("Req User ID:", req.user._id);
        const isAssigned = task.assignedTo.some((id) => id.toString() === req.user._id.toString());

        const isCreator = task.createdBy.toString() === req.user._id.toString();

        if (!isAssigned && !isCreator && req.user.role !== "manager") {
            return res.status(403).json({ message: "Not authorized to update this task" });
        }

        // console.log("Req Body:", req.body);
        task.status = req.body.status || task.status;

        if (task.status === "Completed") {
            if (task.todoChecklist) {
                task.todoChecklist.forEach((item) => {
                    item.completed = true;
                });
            }
            task.progress = 100;
        } else if (task.status === "In Progress") {
            if (task.todoChecklist) {
                task.todoChecklist.forEach((item) => {
                    item.completed = false;
                });
            }
            task.progress = 50;
        } else if (task.status === "Pending") {
            if (task.todoChecklist) {
                task.todoChecklist.forEach((item) => {
                    item.completed = false;
                });
            }
            task.progress = 0;
        }

        await task.save();

        // Check for Auto-Release Hold
        // If task is completed, check if assignee has any other pending tasks.
        if (task.status === "Completed") {
            const assigneeIds = task.assignedTo;
            if (assigneeIds && assigneeIds.length > 0) {
                for (const userId of assigneeIds) {
                    const user = await User.findById(userId);
                    if (user && user.isOnHold) {
                        // Check if they have any other tasks that are NOT completed
                        const pendingCount = await Task.countDocuments({
                            assignedTo: userId,
                            status: { $ne: "Completed" }
                        });

                        if (pendingCount === 0) {
                            user.isOnHold = false;
                            await user.save();
                        }
                    }
                }
            }
        }

        res.status(200).json({ message: "Task status updated successfully!", task });
    } catch (error) {
        console.error("Update Task Status Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc Delete a task
// @route DELETE /api/tasks/:id
// @access Private

const deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: "Task not found" });

        // Check if user is Manager OR Creator
        if (req.user.role !== "manager" && task.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied. Only the Task Creator or Manager can delete this task." });
        }

        await task.deleteOne();
        res.json({ message: "Task deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc Update task checklist
// @route PUT /api/tasks/:id/todo
// @access Private

const updateTaskChecklist = async (req, res) => {
    try {
        const { todoChecklist } = req.body;
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const isAssigned = task.assignedTo.some((id) => id.toString() === req.user._id.toString());
        const isCreator = task.createdBy.toString() === req.user._id.toString();

        if (!isAssigned && !isCreator && req.user.role !== "manager") {
            return res.status(403).json({ message: "Not authorized to update this task" });
        }

        task.todoChecklist = todoChecklist;

        // Auto-update progress based on chekcklist completion
        const completedCount = task.todoChecklist.filter(
            (item) => item.completed
        ).length;
        const totalItems = task.todoChecklist.length;
        task.progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

        // Auto-update task status based on progress
        if (task.progress === 100) {
            task.status = "Completed";
        } else if (task.progress > 0) {
            task.status = "In Progress";
        } else {
            task.status = "Pending";
        }

        await task.save();
        const updatedTask = await Task.findById(req.params.id).populate("assignedTo", "name email profileImageUrl");
        const completedCountAfterUpdate = updatedTask.todoChecklist.filter((item) => item.completed).length;

        res.json({
            message: "Task checklist updated successfully!",
            task: {
                ...updatedTask._doc,
                completedTodoCount: completedCountAfterUpdate
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


// @desc Get dashboard data
// @route Get /api/tasks/dashboard-data
// @access Private
const getDashboardData = async (req, res) => {
    try {
        // Fetch statistics
        const totalTasks = await Task.countDocuments();
        const pendingTasks = await Task.countDocuments({ status: "Pending" });
        const completedTasks = await Task.countDocuments({ status: "Completed" });
        const overdueTasks = await Task.countDocuments({
            status: { $ne: "Completed" },
            dueDate: { $lt: new Date() },
        });

        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistributionRaw = await Task.aggregate([
            {
                $match: {
                    ...((req.user.role != "admin" && req.user.role != "manager") && { assignedTo: req.user._id })
                }
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                },
            },
        ]);

        const taskDistribution = taskStatuses.reduce((acc, status) => {
            const formattedKey = status.replace(/\s+/g, "");
            acc[formattedKey] = taskDistributionRaw.find((item) => item._id === status)?.count || 0;
            return acc;
        }, {});
        taskDistribution["All"] = totalTasks;

        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
            {
                $match: {
                    ...((req.user.role != "admin" && req.user.role != "manager") && { assignedTo: req.user._id })
                }
            },
            {
                $group: {
                    _id: "$priority",
                    count: { $sum: 1 }
                },
            },
        ]);

        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            const formattedKey = priority.replace(/\s+/g, "");
            acc[formattedKey] = taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
            return acc;
        }, {});

        // Fetch recent 10 tasks
        const recentTasks = await Task.find().sort({ createdAt: -1 }).limit(10).select("title status priority dueDate createdAt");

        // Last 7 Days Activity (Completed Tasks)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const last7DaysRaw = await Task.aggregate([
            {
                $match: {
                    status: "Completed",
                    updatedAt: { $gte: sevenDaysAgo },
                    ...((req.user.role != "admin" && req.user.role != "manager") && { assignedTo: req.user._id })
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Tasks by Department
        const tasksByDepartmentRaw = await Task.aggregate([
            {
                $match: {
                    assignedTo: { $ne: [] }
                }
            },
            {
                $unwind: "$assignedTo"
            },
            {
                $lookup: {
                    from: "users",
                    localField: "assignedTo",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            {
                $unwind: "$userDetails"
            },
            {
                $group: {
                    _id: "$userDetails.department",
                    count: { $sum: 1 }
                }
            }
        ]);

        const tasksByDepartment = tasksByDepartmentRaw.reduce((acc, item) => {
            const dept = item._id || "Other";
            acc[dept] = item.count;
            return acc;
        }, {});

        // Active Workload by User (Pending/In Progress)
        const activeWorkloadRaw = await Task.aggregate([
            {
                $match: {
                    status: { $in: ["Pending", "In Progress"] },
                    assignedTo: { $ne: [] }
                }
            },
            {
                $unwind: "$assignedTo"
            },
            {
                $group: {
                    _id: "$assignedTo",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            {
                $unwind: "$userDetails"
            },
            {
                $project: {
                    _id: 1,
                    count: 1,
                    name: "$userDetails.name"
                }
            }
        ]);

        const activeWorkload = activeWorkloadRaw.map(item => ({
            name: item.name,
            count: item.count
        }));

        // Fill in missing days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const found = last7DaysRaw.find(item => item._id === dateStr);
            last7Days.push({
                name: moment(d).format("ddd"), // Mon, Tue...
                date: dateStr,
                count: found ? found.count : 0
            });
        }

        // Top 5 Performers
        const topPerformersRaw = await Task.aggregate([
            {
                $match: {
                    status: "Completed",
                    assignedTo: { $ne: [] }
                }
            },
            {
                $unwind: "$assignedTo"
            },
            {
                $group: {
                    _id: "$assignedTo",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 5
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            {
                $unwind: "$userDetails"
            },
            {
                $project: {
                    _id: 1,
                    count: 1,
                    name: "$userDetails.name",
                    email: "$userDetails.email",
                    profileImageUrl: "$userDetails.profileImageUrl",
                    department: "$userDetails.department"
                }
            }
        ]);

        const topPerformers = topPerformersRaw;


        res.status(200).json({
            statistics: {
                totalTasks,
                pendingTasks,
                completedTasks,
                overdueTasks,
            },
            charts: {
                taskDistribution,
                taskPriorityLevels,
                last7Days,
                topPerformers,
                tasksByDepartment,
                activeWorkload
            },
            recentTasks,
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


// @desc Get user dashboard data
// @route Get /api/tasks/user-dashboard-data
// @access Private
const getUserDashboardData = async (req, res) => {
    try {
        const userId = req.user._id; // Only fetch data for the logged-in user

        // Fetch statistics for user-specific tasks

        const totalTasks = await Task.countDocuments({ assignedTo: userId });
        const pendingTasks = await Task.countDocuments({ assignedTo: userId, status: "Pending" });
        const completedTasks = await Task.countDocuments({ assignedTo: userId, status: "Completed" });
        const overdueTasks = await Task.countDocuments({
            assignedTo: userId,
            status: { $ne: "Completed" },
            dueDate: {
                $lt: new Date(),
            }
        });

        // Task distribution by status 
        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistributionRaw = await Task.aggregate([
            {
                $match: { assignedTo: userId },
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                },
            },
        ]);

        const taskDistribution = taskStatuses.reduce((acc, stats) => {
            const formattedKey = stats.replace(/\s+/g, "");
            acc[formattedKey] = taskDistributionRaw.find((item) => item._id === stats)?.count || 0;
            return acc;
        }, {});
        taskDistribution["All"] = totalTasks;

        // Task distribution by priority
        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
            {
                $match: { assignedTo: userId },
            },
            {
                $group: {
                    _id: "$priority",
                    count: { $sum: 1 }
                },
            },
        ]);

        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            acc[priority] =
                taskPriorityLevelsRaw.find((item) => item._id == priority)?.count || 0;
            return acc;
        }, {});

        // Last 7 Days Activity (Completed Tasks for User)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const last7DaysRaw = await Task.aggregate([
            {
                $match: {
                    assignedTo: userId,
                    status: "Completed",
                    updatedAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill in missing days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const found = last7DaysRaw.find(item => item._id === dateStr);
            last7Days.push({
                name: moment(d).format("ddd"), // Mon, Tue...
                date: dateStr,
                count: found ? found.count : 0
            });
        }

        // Fetch recent 10 tasks for the Logged-in user
        const recentTasks = await Task.find({ assignedTo: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select("title status priority dueDate createdAt");

        res.status(200).json({
            statistics: {
                totalTasks,
                pendingTasks,
                completedTasks,
                overdueTasks,
            },
            charts: {
                taskDistribution,
                taskPriorityLevels,
                last7Days,
            },
            recentTasks,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
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
