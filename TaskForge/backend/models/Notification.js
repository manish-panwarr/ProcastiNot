const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: ["TASK_ASSIGNED", "TASK_DEADLINE", "TASK_DEADLINE_1H", "TASK_DEADLINE_1D", "TASK_UPDATED"],
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);


//  INDEXES

notificationSchema.index({ recipient: 1, createdAt: -1 }, { background: true });
notificationSchema.index({ recipient: 1, type: 1, task: 1 }, { background: true });
notificationSchema.index({ recipient: 1, isRead: 1 }, { background: true });

module.exports = mongoose.model("Notification", notificationSchema);
