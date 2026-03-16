const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: { type: String },

    // File attachment (uploaded to server — persisted)
    fileTransfer: {
        fileName: { type: String },
        fileSize: { type: Number },   // bytes
        fileType: { type: String },   // MIME type e.g. 'image/png', 'application/pdf'
        mediaUrl: { type: String },   // Permanent server URL e.g. /uploads/chat/filename.png
        status: {
            type: String,
            enum: ["pending", "complete", "failed"],
            default: "complete"
        }
    },

    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deletedForEveryone: { type: Boolean, default: false },

    status: {
        type: String,
        enum: ["sent", "delivered", "seen"],
        default: "sent"
    }
}, { timestamps: true });

module.exports = mongoose.model("Message", MessageSchema);
