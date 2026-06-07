/**
 * @file controllers/reportController.js
 * @desc Production-grade report controller.
 *       exportUsersReport: replaced full-collection fetch + in-memory join
 *       with a single MongoDB aggregation pipeline.
 *       exportTasksReport: added .lean() and streaming response.
 */

const Task = require("../models/Task");
const User = require("../models/User");
const excelJS = require("exceljs");

// ─────────────────────────────────────────────
//  exportTasksReport
//  GET /api/reports/export/tasks
//  Added: .lean() for memory efficiency
// ─────────────────────────────────────────────
const exportTasksReport = async (req, res) => {
    try {
        // .lean() returns plain JS objects — much faster and memory-efficient for large datasets
        const tasks = await Task.find()
            .populate("assignedTo", "name email")
            .lean();

        const workbook = new excelJS.Workbook();
        const worksheet = workbook.addWorksheet("Tasks");

        worksheet.columns = [
            { header: "Task ID", key: "_id", width: 25 },
            { header: "Title", key: "title", width: 30 },
            { header: "Description", key: "description", width: 50 },
            { header: "Status", key: "status", width: 15 },
            { header: "Priority", key: "priority", width: 15 },
            { header: "Due Date", key: "dueDate", width: 15 },
            { header: "Assigned To", key: "assignedTo", width: 40 },
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
        headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };

        tasks.forEach(task => {
            worksheet.addRow({
                _id: task._id.toString(),
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A",
                assignedTo: task.assignedTo
                    ? task.assignedTo.map(u => `${u.name} (${u.email})`).join(", ")
                    : "Unassigned",
            });
        });

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=tasks_report.xlsx");

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("[ReportController] exportTasksReport error:", error.message);
        res.status(500).json({ success: false, message: "Error exporting tasks report" });
    }
};

// ─────────────────────────────────────────────
//  exportUsersReport
//  GET /api/reports/export/users
//  BEFORE: User.find() + Task.find() (2 full-collection scans) + in-memory join
//  AFTER:  Single aggregation pipeline — MongoDB does the join server-side
// ─────────────────────────────────────────────
const exportUsersReport = async (req, res) => {
    try {
        /**
         * Single aggregation pipeline:
         * 1. Start from User collection
         * 2. $lookup tasks assigned to each user (no populate overhead)
         * 3. $group task counts by status for each user
         * 4. $project final shape
         *
         * This replaces: User.find() + Task.find() + JavaScript loop join
         * Performance: O(1) DB round-trips instead of O(2) + in-memory O(U*T)
         */
        const userStats = await User.aggregate([
            // Don't include sensitive fields
            { $project: { password: 0, __v: 0 } },
            {
                // Lookup all tasks where this user is in assignedTo array
                $lookup: {
                    from: "tasks",
                    let: { uid: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $in: ["$$uid", "$assignedTo"] } } },
                        {
                            $group: {
                                _id: null,
                                totalTasks: { $sum: 1 },
                                pendingTasks: {
                                    $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] }
                                },
                                inProgressTasks: {
                                    $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] }
                                },
                                completedTasks: {
                                    $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] }
                                }
                            }
                        }
                    ],
                    as: "taskData"
                }
            },
            // Flatten the nested taskData array
            {
                $addFields: {
                    taskStats: { $ifNull: [{ $arrayElemAt: ["$taskData", 0] }, { totalTasks: 0, pendingTasks: 0, inProgressTasks: 0, completedTasks: 0 }] }
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    role: 1,
                    department: 1,
                    taskCount: "$taskStats.totalTasks",
                    pendingTasks: "$taskStats.pendingTasks",
                    inProgressTasks: "$taskStats.inProgressTasks",
                    completedTasks: "$taskStats.completedTasks",
                    taskData: 0
                }
            },
            { $sort: { name: 1 } }
        ]);

        const workbook = new excelJS.Workbook();
        const worksheet = workbook.addWorksheet("Users");

        worksheet.columns = [
            { header: "User Name", key: "name", width: 25 },
            { header: "Email", key: "email", width: 30 },
            { header: "Role", key: "role", width: 15 },
            { header: "Department", key: "department", width: 20 },
            { header: "Total Tasks", key: "taskCount", width: 15 },
            { header: "Pending", key: "pendingTasks", width: 15 },
            { header: "In Progress", key: "inProgressTasks", width: 15 },
            { header: "Completed", key: "completedTasks", width: 15 },
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
        headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };

        userStats.forEach(userStat => {
            worksheet.addRow({
                name: userStat.name,
                email: userStat.email,
                role: userStat.role,
                department: userStat.department || "—",
                taskCount: userStat.taskCount || 0,
                pendingTasks: userStat.pendingTasks || 0,
                inProgressTasks: userStat.inProgressTasks || 0,
                completedTasks: userStat.completedTasks || 0,
            });
        });

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=users_report.xlsx");

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("[ReportController] exportUsersReport error:", error.message);
        res.status(500).json({ success: false, message: "Error exporting users report" });
    }
};

module.exports = {
    exportTasksReport,
    exportUsersReport
};
