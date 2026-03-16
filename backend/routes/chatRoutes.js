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

const fs = require("fs");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../uploads/chat");
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/\s+/g, "_").slice(0, 60);
        cb(null, `${Date.now()}-${base}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = /image\/*|video\/*|audio\/*|application\/(pdf|msword|vnd\.openxmlformats|vnd\.ms-|zip|x-zip|x-rar|x-7z)|text\/.*/;
    if (allowed.test(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Unsupported file type"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
});

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
