require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const cron = require("node-cron");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");

const connectDB = require("./config/db");
const { getRedisClient, testRedisConnection, getCache, setCache } = require("./config/redis");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/taskRoutes");
const reportRoutes = require("./routes/reportRoutes");
const chatRoutes = require("./routes/chatRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const { globalLimiter } = require("./middlewares/rateLimiter");
const { protect } = require("./middlewares/authMiddleware");
const { sendDeadlineReminderEmail } = require("./utils/emailService");

const Task = require("./models/Task");
const Notification = require("./models/Notification");
const Message = require("./models/Message");


//  App & Server
const app = express();
const server = http.createServer(app);


//  CORS
const allowedOrigins = [
    "https://procasti-not-chi.vercel.app",
    process.env.CLIENT_URL,
    "http://localhost:5173",
].filter(Boolean);

function isOriginAllowed(origin) {
    if (!origin) return true;
    if (allowedOrigins.some(o => o && origin.startsWith(o))) return true;
    if (origin.endsWith(".vercel.app")) return true;
    return false;
}

const corsOptions = {
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) return callback(null, true);
        return callback(new Error("Access denied"));
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
        "X-Device-ID",
    ],
};


//  MIDDLEWARE
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Global rate limiter — BEFORE routes
// All routes limited to 100 req/min per IP
app.use(globalLimiter);

//  SOCKET.IO
const io = new Server(server, {
    path: "/socket.io",
    cors: {
        origin: (origin, callback) => {
            if (isOriginAllowed(origin)) return callback(null, true);
            return callback(new Error("CORS not allowed"));
        },
        credentials: true,
        methods: ["GET", "POST"],
    },
    transports: ["polling", "websocket"],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e7,
    connectTimeout: 45000,
});

app.set("io", io);
require("./socket/index")(io);

//  DATABASE
connectDB();

getRedisClient();
testRedisConnection();

//  ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);

// Test Route for Redis
app.get("/redis-test", async (req, res) => {
    try {
        await setCache("test-key", { message: "Hello from pure Upstash!", timestamp: Date.now() }, 60);
        const data = await getCache("test-key");
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

//  HEALTH CHECK
app.get("/health", (req, res) => {
    const { isRedisReady } = require("./config/redis");
    res.json({
        status: "ok",
        uptime: Math.floor(process.uptime()),
        ts: Date.now(),
        redis: isRedisReady() ? "connected" : "disconnected",
        env: process.env.NODE_ENV || "development",
    });
});


//  ICE SERVERS (WebRTC)
//  Protected: requires authentication — TURN credentials must not be public
app.get("/api/ice-servers", protect, (req, res) => {
    const servers = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun.cloudflare.com:3478" },
    ];

    const { TURN_URL, TURN_USERNAME, TURN_CREDENTIAL } = process.env;
    if (TURN_URL && TURN_USERNAME && TURN_CREDENTIAL) {
        servers.push(
            { urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL },
            {
                urls: TURN_URL.replace(/^turn:/, "turns:") + "?transport=tcp",
                username: TURN_USERNAME,
                credential: TURN_CREDENTIAL
            }
        );
        console.log("[ICE] Serving TURN + STUN servers");
    } else {
        console.warn("[ICE] TURN not configured — STUN only.");
    }
    res.json(servers);
});


//  CRON — Task Deadline Notifications
cron.schedule("* * * * *", async () => {
    try {
        const { setCache, existsCache } = require("./config/redis");
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const tasks = await Task.find({
            status: { $ne: "Completed" },
            dueDate: { $gt: now, $lte: oneDayLater }
        }).select("_id title assignedTo dueDate").lean();

        for (const task of tasks) {
            for (const userId of task.assignedTo) {
                const notificationType = task.dueDate <= oneHourLater
                    ? "TASK_DEADLINE_1H"
                    : "TASK_DEADLINE_1D";
                const message = notificationType === "TASK_DEADLINE_1H"
                    ? `1 hour left for your task: ${task.title}`
                    : `1 day left for your task: ${task.title}`;

                // Redis dedup: check + set in O(1) — replaces Notification.findOne
                const dedupKey = `cronDedup:${task._id}:${userId}:${notificationType}`;
                let alreadySent = await existsCache(dedupKey);

                if (!alreadySent) {
                    const existingNotification = await Notification.findOne({
                        recipient: userId,
                        type: notificationType,
                        task: task._id
                    }).lean();

                    if (existingNotification) {
                        alreadySent = true;
                        // Warm up Redis cache to avoid hitting MongoDB on subsequent cron runs
                        const ttl = notificationType === "TASK_DEADLINE_1H" ? 7200 : 90000; // 2h or 25h
                        await setCache(dedupKey, "1", ttl);
                    }
                }

                if (!alreadySent) {
                    const ttl = notificationType === "TASK_DEADLINE_1H" ? 7200 : 90000; // 2h or 25h
                    // Mark as sent in Redis before writing to DB (prevents race on restart)
                    await setCache(dedupKey, "1", ttl);

                    const notify = new Notification({
                        recipient: userId,
                        type: notificationType,
                        message,
                        task: task._id
                    });
                    await notify.save();

                    // Real-time in-app notification via Socket.IO
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

                    // Email notification — fire-and-forget, doesn't block cron
                    const User = require("./models/User");
                    const recipient = await User.findById(userId).select("name email").lean();
                    if (recipient?.email) {
                        const emailType = notificationType === "TASK_DEADLINE_1H" ? "1H" : "1D";
                        sendDeadlineReminderEmail(recipient, task, emailType).catch(err =>
                            console.error("[Email] sendDeadlineReminderEmail failed:", err.message)
                        );
                    }
                }
            }
        }
    } catch (error) {
        console.error("[CRON] Deadline notification error:", error.message);
    }
});


//  CRON — Purge Soft-Deleted Messages (Daily midnight)

cron.schedule("0 0 * * *", async () => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await Message.deleteMany({
            isDeleted: true,
            deletedAt: { $lte: thirtyDaysAgo }
        });
        console.log(`[CRON] Purged ${result.deletedCount} old soft-deleted messages.`);
    } catch (error) {
        console.error("[CRON] Purge error:", error.message);
    }
});


//  START SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`[Server] Running on port ${PORT} (${process.env.NODE_ENV || "development"})`));
