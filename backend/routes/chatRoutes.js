const express = require("express");
const path = require("path");
const multer = require("multer");
const { protect } = require("../middlewares/authMiddleware");
const {
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
} = require("../controllers/chatController");

const router = express.Router();

const upload = require("../middlewares/chatUploadMiddleware");

router.get("/conversations", protect, getConversations);
router.get("/messages/:conversationId", protect, getMessages);
router.post("/send", protect, upload.array("files", 10), sendMessage);
router.put("/seen/:conversationId", protect, markAsSeen);
router.delete("/conversation/:conversationId", protect, deleteConversation);
router.delete("/clear/:conversationId", protect, clearChat);
router.delete("/message/:messageId", protect, deleteMessage);
router.get("/shared-files/:conversationId", protect, getSharedFiles);
router.post("/group/create", protect, upload.single("groupAvatar"), createGroup);
router.put("/group/:conversationId", protect, upload.single("groupAvatar"), updateGroupSettings);

module.exports = router;
