const dotenv = require("dotenv");
dotenv.config();
const cloudinary = require("cloudinary").v2;
const multer = require("multer");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file buffer to Cloudinary using a stream.
 * @param {Buffer} fileBuffer - The file content as a buffer.
 * @param {string} folder - The folder to upload to in Cloudinary.
 * @param {string} resourceType - 'auto', 'image', 'video', or 'raw' (for PDFs/docs).
 * @returns {Promise<object>} - The Cloudinary upload result.
 */
const uploadToCloudinary = (fileBuffer, folder = "task-manager", resourceType = "auto") => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { 
                folder, 
                resource_type: resourceType,
                // For PDFs and other files, 'raw' is sometimes better, but 'auto' works for most.
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(fileBuffer);
    });
};

const storage = multer.memoryStorage(); // Use memory storage for Cloudinary uploads
const upload = multer({ storage: storage });

module.exports = { cloudinary, upload, uploadToCloudinary };
