const multer = require("multer");

// Configure storage engine to memory
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'text/plain',
        'video/mp4', 'video/webm', 'video/ogg', 'video/x-matroska', 'video/quicktime', 'video/x-msvideo'
    ];

    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, videos, PDFs, and documents are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit is safer for memory, Cloudinary fee tier might have limits
});

module.exports = upload;

