const multer = require("multer");

// Configure storage engine to memory
const storage = multer.memoryStorage();

// File filter (Optional, as Cloudinary handles many types, but keep for security)
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image formats are allowed'), false);
    }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;