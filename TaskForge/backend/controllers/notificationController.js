const Notification = require("../models/Notification");


//  getNotifications
//  GET /api/notifications
const getNotifications = async (req, res) => {
    try {
        // Limit to 50 most recent — unbounded result sets are a DoS risk
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate("task", "title")
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.status(200).json({ success: true, notifications });

    } catch (error) {
        console.error("[NotificationController] getNotifications error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch notifications" });
    }
};



//  markAsRead
//  PUT /api/notifications/:id/read
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        res.status(200).json({ success: true, notification });

        // Delete the notification after response is sent.
        setImmediate(async () => {
            try {
                await Notification.findByIdAndDelete(notification._id);
                const io = req.app.get("io");
                if (io) {
                    io.to(req.user._id.toString()).emit("notifications_deleted", {
                        ids: [notification._id]
                    });
                }
            } catch (err) {
                console.error("[NotificationController] Auto-delete error:", err.message);
            }
        });

    } catch (error) {
        console.error("[NotificationController] markAsRead error:", error.message);
        res.status(500).json({ success: false, message: "Failed to mark notification as read" });
    }
};


//  markAllAsRead
//  PUT /api/notifications/read-all
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;

        await Notification.updateMany(
            { recipient: userId, isRead: false },
            { isRead: true }
        );

        res.status(200).json({ success: true, message: "All notifications marked as read" });

        // Clean up read notifications after response — no memory leak
        setImmediate(async () => {
            try {
                const toDelete = await Notification.find({ recipient: userId, isRead: true })
                    .select("_id")
                    .lean();

                const ids = toDelete.map(n => n._id);

                if (ids.length > 0) {
                    await Notification.deleteMany({ _id: { $in: ids } });
                    const io = req.app.get("io");
                    if (io) {
                        io.to(userId.toString()).emit("notifications_deleted", { ids });
                    }
                }
            } catch (err) {
                console.error("[NotificationController] Auto-delete-all error:", err.message);
            }
        });

    } catch (error) {
        console.error("[NotificationController] markAllAsRead error:", error.message);
        res.status(500).json({ success: false, message: "Failed to mark notifications as read" });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
};
