const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
    text: { type: String, required: true },
    completed: { type: Boolean, default: false }
});

const taskSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: { type: String, required: true },

        priority: {
            type: String,
            enum: ["Low", "Medium", "High"],
            required: true
        },

        status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed"],
            default: "Pending"
        },

        dueDate: { type: Date, required: true },

        assignedTo: [
            { type: mongoose.Schema.Types.ObjectId, ref: "User" }
        ],

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        attachments: [
            {
                fileUrl: { type: String, required: true },
                fileType: { type: String, default: "link" },
                originalName: { type: String, required: true },
                publicId: { type: String }
            }
        ],

        todoChecklist: [todoSchema],
        progress: { type: Number, default: 0 }
    },
    { timestamps: true }
);


//  INDEXES

taskSchema.index({ assignedTo: 1, status: 1 }, { background: true });
taskSchema.index({ createdBy: 1 }, { background: true });
taskSchema.index({ status: 1, dueDate: 1 }, { background: true });
taskSchema.index({ status: 1, updatedAt: -1 }, { background: true });
taskSchema.index({ createdAt: -1 }, { background: true });
taskSchema.index({ dueDate: 1 }, { background: true });
taskSchema.index({ title: "text", description: "text" }, { background: true });

module.exports = mongoose.model("Task", taskSchema);
