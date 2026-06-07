const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: { type: String },

    // File attachment (uploaded to server — persisted)
    fileTransfer: {
        fileName: { type: String },
        fileSize: { type: Number },
        fileType: { type: String },
        mediaUrl: { type: String },
        status: {
            type: String,
            enum: ["pending", "complete", "failed"],
            default: "complete"
        }
    },

    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deletedForEveryone: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    isEdited: { type: Boolean, default: false },

    status: {
        type: String,
        enum: ["sent", "delivered", "seen"],
        default: "sent"
    }
}, { timestamps: true });


//  INDEXES

MessageSchema.index({ conversationId: 1, createdAt: -1 }, { background: true });
MessageSchema.index({ isDeleted: 1, deletedAt: 1 }, { background: true });
MessageSchema.index({ sender: 1 }, { background: true });

module.exports = mongoose.model("Message", MessageSchema);
