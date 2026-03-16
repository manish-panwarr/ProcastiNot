const Notification = require("../models/Notification");

// @desc Get all notifications for user
// @route GET /api/notifications
// @access Private
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate("task", "title")
            .sort({ createdAt: -1 });

        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc Mark notification as read
// @route PUT /api/notifications/:id/read
// @access Private
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json(notification);

        // Auto-delete this read notification after 5 seconds
        const notifId = notification._id;
        const userId = req.user._id;
        const io = req.app.get("io");
        setTimeout(async () => {
            try {
                await Notification.findByIdAndDelete(notifId);
                if (io) {
                    io.to(userId.toString()).emit("notifications_deleted", { ids: [notifId] });
                }
            } catch (err) {
                console.error("Auto-delete notification error:", err);
            }
        }, 5000);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc Mark all notifications as read
// @route PUT /api/notifications/read-all
// @access Private
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        await Notification.updateMany(
            { recipient: userId, isRead: false },
            { isRead: true }
        );
        res.status(200).json({ message: "All notifications marked as read" });

        // Auto-delete all read notifications after 5 seconds
        const io = req.app.get("io");
        setTimeout(async () => {
            try {
                const toDelete = await Notification.find({ recipient: userId, isRead: true }).select("_id");
                const ids = toDelete.map(n => n._id);
                if (ids.length > 0) {
                    await Notification.deleteMany({ _id: { $in: ids } });
                    if (io) {
                        io.to(userId.toString()).emit("notifications_deleted", { ids });
                    }
                }
            } catch (err) {
                console.error("Auto-delete all read notifications error:", err);
            }
        }, 5000);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
};
