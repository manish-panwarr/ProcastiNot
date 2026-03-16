require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/taskRoutes");
const reportRoutes = require("./routes/reportRoutes");
const chatRoutes = require("./routes/chatRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const cron = require("node-cron");
const Task = require("./models/Task");
const Notification = require("./models/Notification");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

/* CORS CONFIG  */

const allowedOrigins = [
    process.env.CLIENT_URL,

].filter(Boolean);

//  origin checker 
function isOriginAllowed(origin) {
    return true; // Allow all origins to prevent CORS issues with Vercel and Socket.io
}

const corsOptions = {
    origin: function (origin, callback) {
        if (isOriginAllowed(origin)) return callback(null, true);
        return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "ngrok-skip-browser-warning",
        "Accept",
        "X-Requested-With",
        "Origin",
    ],
};

/*  MIDDLEWARE  */

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/*  SOCKET.IO  */

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            if (isOriginAllowed(origin)) return callback(null, true);
            return callback(new Error("CORS not allowed"));
        },
        credentials: true,
        methods: ["GET", "POST"],
    },
});

app.set("io", io);
require("./socket/index")(io);

/*  DB  */
connectDB();

/*  ROUTES  */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);


// Check for task deadlines every minute
// don't use setTimeout, because ye server ki ram me store hoga, or agar server restart huwa to ye notificaiton duration v server ki ram se hat jayegi or message kavi nahi jayega.
cron.schedule("* * * * *", async () => {
    try {
        const now = new Date();

        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour ahead
        const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours ahead

        // Find tasks due in next 24 hours
        const tasks = await Task.find({
            status: { $ne: "Completed" },
            dueDate: {
                $gt: now,
                $lte: oneDayLater
            }
        });

        for (const task of tasks) {
            for (const userId of task.assignedTo) {

                let notificationType = null;
                let message = "";

                // Determine which reminder should be sent
                if (task.dueDate <= oneHourLater) {
                    notificationType = "TASK_DEADLINE_1H";
                    message = `1 hour left for your task: ${task.title}`;
                } else {
                    notificationType = "TASK_DEADLINE_1D";
                    message = `1 day left for your task: ${task.title}`;
                }

                // Check if this specific reminder already exists
                const existingNotification = await Notification.findOne({
                    recipient: userId,
                    task: task._id,
                    type: notificationType
                });

                if (!existingNotification) {
                    const notify = new Notification({
                        recipient: userId,
                        type: notificationType,
                        message: message,
                        task: task._id
                    });

                    await notify.save();

                    // Emit event to target user via io
                    const ioSocket = app.get("io");
                    if (ioSocket) {
                        ioSocket.to(userId.toString()).emit("new_notification", {
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
        }

    } catch (error) {
        console.error("Cron Job Error:", error);
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));