const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const fs = require("fs");
const path = require("path");

const getConversations = async (req, res) => {
    try {
        const userId = req.user._id;
        const conversations = await Conversation.find({
            participants: { $in: [userId] }
        })
            .populate("participants", "name profileImageUrl department email mobile bio role")
            .populate("groupAdmins", "name profileImageUrl")
            .populate("createdBy", "name")
            .populate({
                path: "lastMessage",
                select: "text fileTransfer createdAt sender status deletedForEveryone deletedFor",
                populate: { path: "sender", select: "name" }
            })
            .sort({ lastMessageAt: -1, updatedAt: -1 });

        const convIds = conversations.map(c => c._id);
        const unreadAgg = await Message.aggregate([
            {
                $match: {
                    conversationId: { $in: convIds },
                    sender: { $ne: userId },
                    status: { $ne: "seen" },
                    deletedForEveryone: { $ne: true },
                    deletedFor: { $nin: [userId] }
                }
            },
            { $group: { _id: "$conversationId", count: { $sum: 1 } } }
        ]);
        const unreadMap = {};
        unreadAgg.forEach(r => { unreadMap[r._id.toString()] = r.count; });

        const filtered = conversations.map(conv => {
            const convObj = conv.toObject();
            if (convObj.lastMessage) {
                const msg = convObj.lastMessage;
                const isDeletedForMe = msg.deletedFor?.some(id => id.toString() === userId.toString());
                if (msg.deletedForEveryone || isDeletedForMe) {
                    convObj.lastMessage = null;
                }
            }
            convObj.unreadCount = unreadMap[convObj._id.toString()] || 0;
            return convObj;
        });

        res.status(200).json(filtered);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const messages = await Message.find({
            conversationId,
            deletedFor: { $nin: [userId] }
        })
            .populate("sender", "name profileImageUrl")
            .sort({ createdAt: 1 });

        const processed = messages.map(msg => {
            const m = msg.toObject();
            if (m.deletedForEveryone) {
                return { ...m, text: null, fileTransfer: null, _isDeletedForEveryone: true };
            }
            return m;
        });

        await Message.updateMany(
            { conversationId, sender: { $ne: userId }, status: "sent" },
            { $set: { status: "delivered" } }
        );

        res.status(200).json(processed);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const sendMessage = async (req, res) => {
    try {
        const senderId = req.user._id;
        const { recipientId, text, conversationId: groupConvId } = req.body;

        let conversation;

        if (groupConvId) {
            conversation = await Conversation.findById(groupConvId);
            if (!conversation) return res.status(404).json({ message: "Conversation not found" });

            if (conversation.messagingMode === "admin_only") {
                const isAdmin =
                    conversation.groupAdmins.some(a => a.toString() === senderId.toString()) ||
                    conversation.createdBy?.toString() === senderId.toString();
                if (!isAdmin) {
                    return res.status(403).json({ message: "Only admins can send messages in this group" });
                }
            }
        } else {
            conversation = await Conversation.findOne({
                participants: { $all: [senderId, recipientId] },
                isGroup: false
            });
            if (!conversation) {
                conversation = await Conversation.create({ participants: [senderId, recipientId] });
            }
        }

        const io = req.app.get("io");
        const createdMessages = [];

        if (text && text.trim()) {
            const textMsg = await Message.create({
                conversationId: conversation._id,
                sender: senderId,
                text: text.trim(),
                status: "sent"
            });
            const populated = await Message.findById(textMsg._id).populate("sender", "name profileImageUrl");
            createdMessages.push(populated);
        }

        const uploadedFiles = req.files || [];
        for (const file of uploadedFiles) {
            const mediaUrl = `/uploads/chat/${file.filename}`;
            const fileMsg = await Message.create({
                conversationId: conversation._id,
                sender: senderId,
                status: "sent",
                fileTransfer: {
                    fileName: file.originalname,
                    fileSize: file.size,
                    fileType: file.mimetype,
                    mediaUrl,
                    status: "complete"
                }
            });
            const populated = await Message.findById(fileMsg._id).populate("sender", "name profileImageUrl");
            createdMessages.push(populated);
        }

        if (createdMessages.length > 0) {
            const lastMsg = createdMessages[createdMessages.length - 1];
            conversation.lastMessage = lastMsg._id;
            conversation.lastMessageAt = new Date();
            await conversation.save();

            if (io) {
                if (conversation.isGroup) {
                    createdMessages.forEach(msg => {
                        io.to(`group:${conversation._id}`).emit("receive_group_message", { ...msg.toObject(), conversationId: conversation._id });
                    });
                }
                conversation.participants.forEach(participantId => {
                    io.to(participantId.toString()).emit("conversation_updated", {
                        conversationId: conversation._id,
                        lastMessage: createdMessages[createdMessages.length - 1],
                        lastMessageAt: conversation.lastMessageAt,
                        participants: conversation.participants
                    });
                });
            }

            return res.status(201).json(createdMessages.length === 1 ? createdMessages[0] : createdMessages);
        }

        return res.status(400).json({ message: "No content to send" });
    } catch (error) {
        console.error("sendMessage error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const markAsSeen = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        await Message.updateMany(
            { conversationId, sender: { $ne: userId }, status: { $ne: "seen" } },
            { $set: { status: "seen" } }
        );

        const io = req.app.get("io");
        if (io) {
            io.emit("messages_seen", { conversationId, userId });
        }

        res.status(200).json({ message: "Marked as seen" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const deleteConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Conversation not found" });

        // 1. Delete Group Avatar if exists
        if (conversation.groupAvatar) {
            const avatarPath = path.join(__dirname, "..", conversation.groupAvatar);
            if (fs.existsSync(avatarPath)) {
                fs.unlinkSync(avatarPath);
            }
        }

        // 2. Delete all files shared in this conversation
        const messagesWithFiles = await Message.find({
            conversationId,
            "fileTransfer.mediaUrl": { $exists: true }
        });

        messagesWithFiles.forEach(msg => {
            if (msg.fileTransfer && msg.fileTransfer.mediaUrl) {
                const filePath = path.join(__dirname, "..", msg.fileTransfer.mediaUrl);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        });

        // 3. Delete messages and conversation
        await Message.deleteMany({ conversationId });
        await Conversation.findByIdAndDelete(conversationId);

        const io = req.app.get("io");
        if (io) io.emit("conversation_deleted", { conversationId });

        res.status(200).json({ message: "Conversation deleted" });
    } catch (error) {
        console.error("Delete Group Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const clearChat = async (req, res) => {
    try {
        const { conversationId } = req.params;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Conversation not found" });

        // Delete all files shared in this conversation
        const messagesWithFiles = await Message.find({
            conversationId,
            "fileTransfer.mediaUrl": { $exists: true }
        });

        messagesWithFiles.forEach(msg => {
            if (msg.fileTransfer && msg.fileTransfer.mediaUrl) {
                const filePath = path.join(__dirname, "..", msg.fileTransfer.mediaUrl);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        });

        // Delete all messages but keep the conversation
        await Message.deleteMany({ conversationId });

        // Clear last message reference
        conversation.lastMessage = null;
        conversation.lastMessageAt = null;
        await conversation.save();

        const io = req.app.get("io");
        if (io) io.emit("chat_cleared", { conversationId });

        res.status(200).json({ message: "Chat cleared" });
    } catch (error) {
        console.error("Clear Chat Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;
        const { type } = req.query; // 'forMe' or 'forEveryone'

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Message not found" });

        const io = req.app.get("io");

        if (type === 'forEveryone') {
            if (message.sender.toString() !== userId.toString()) {
                return res.status(403).json({ message: "You can only delete your own messages for everyone" });
            }
            message.deletedForEveryone = true;
            await message.save();
            if (io) io.emit("message_deleted", { messageId, type: 'forEveryone', conversationId: message.conversationId });
        } else {
            if (!message.deletedFor.includes(userId)) {
                message.deletedFor.push(userId);
                await message.save();
            }
            if (io) io.emit("message_deleted", { messageId, type: 'forMe', conversationId: message.conversationId, userId });
        }

        res.status(200).json({ message: "Message deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const getSharedFiles = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const messages = await Message.find({
            conversationId,
            "fileTransfer.status": "complete",
            deletedFor: { $nin: [userId] },
            deletedForEveryone: false
        }).sort({ createdAt: -1 });

        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const createGroup = async (req, res) => {
    try {
        let { groupName, memberIds } = req.body;
        const userId = req.user._id;

        if (typeof memberIds === 'string') {
            try { memberIds = JSON.parse(memberIds); } catch (e) { memberIds = []; }
        }

        if (!groupName || !memberIds || memberIds.length === 0) {
            return res.status(400).json({ message: "Group name and members are required" });
        }

        const participants = [...new Set([...memberIds, userId.toString()])];

        let groupAvatar = "";
        if (req.file) {
            groupAvatar = `/uploads/chat/${req.file.filename}`;
        }

        const conversation = await Conversation.create({
            isGroup: true,
            groupName,
            groupAvatar,
            participants,
            groupAdmins: [userId],
            createdBy: userId,
            messagingMode: 'everyone'
        });

        const io = req.app.get("io");

        const populated = await Conversation.findById(conversation._id)
            .populate("participants", "name profileImageUrl")
            .populate("groupAdmins", "name profileImageUrl")
            .populate("createdBy", "name");

        if (io) {
            io.emit("group_created", populated);
        }

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const updateGroupSettings = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;
        const { groupName, messagingMode, addMemberIds, removeMemberId, promoteAdminId, demoteAdminId, removeAvatar } = req.body;
        const groupAvatar = req.file;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.isGroup) {
            return res.status(404).json({ message: "Group not found" });
        }

        const isCreator = conversation.createdBy?.toString() === userId.toString();
        const isGroupAdmin = conversation.groupAdmins.some(a => a.toString() === userId.toString());
        const isSystemAdmin = req.user.role === "admin" || req.user.role === "manager";

        if (!isCreator && !isGroupAdmin && !isSystemAdmin) {
            return res.status(403).json({ message: "Only group admins can update settings" });
        }

        if (groupName) conversation.groupName = groupName;
        if (messagingMode) conversation.messagingMode = messagingMode;

        if (groupAvatar) {
            conversation.groupAvatar = `/uploads/chat/${groupAvatar.filename}`;
        } else if (removeAvatar === "true") {
            conversation.groupAvatar = "";
        }

        if (addMemberIds) {
            let ids = addMemberIds;
            if (typeof ids === 'string') {
                try { ids = JSON.parse(ids); } catch (e) { ids = [ids]; }
            }
            if (Array.isArray(ids)) {
                const toAdd = ids.filter(id => !conversation.participants.some(p => p.toString() === id));
                conversation.participants.push(...toAdd);
            }
        }

        if (removeMemberId) {
            conversation.participants = conversation.participants.filter(
                p => p.toString() !== removeMemberId
            );
            conversation.groupAdmins = conversation.groupAdmins.filter(
                a => a.toString() !== removeMemberId
            );
        }

        if (promoteAdminId) {
            if (!conversation.groupAdmins.some(a => a.toString() === promoteAdminId)) {
                conversation.groupAdmins.push(promoteAdminId);
            }
        }

        if (demoteAdminId) {
            if (demoteAdminId === conversation.createdBy?.toString()) {
                return res.status(400).json({ message: "Cannot demote the group creator" });
            }
            conversation.groupAdmins = conversation.groupAdmins.filter(
                a => a.toString() !== demoteAdminId
            );
        }

        await conversation.save();

        const updated = await Conversation.findById(conversationId)
            .populate("participants", "name profileImageUrl department email role")
            .populate("groupAdmins", "name profileImageUrl")
            .populate("createdBy", "name");

        const io = req.app.get("io");
        if (io) io.emit("group_updated", updated.toObject());

        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

module.exports = {
    getConversations,
    getMessages,
    sendMessage,
    markAsSeen,
    deleteConversation,
    clearChat,
    deleteMessage,
    getSharedFiles,
    createGroup,
    updateGroupSettings
};
