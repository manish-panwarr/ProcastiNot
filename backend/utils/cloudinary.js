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
const uploadToCloudinary = (fileBuffer, folder = "task-manager", resourceType = "auto", mimetype = "application/octet-stream") => {
    return new Promise((resolve, reject) => {
        const b64 = Buffer.from(fileBuffer).toString("base64");
        const dataURI = "data:" + mimetype + ";base64," + b64;
        
        cloudinary.uploader.upload(dataURI, {
            folder,
            resource_type: resourceType,
        }, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
    });
};

const storage = multer.memoryStorage(); // Use memory storage for Cloudinary uploads
const upload = multer({ storage: storage });

const deleteFromCloudinary = async (mediaUrl) => {
    try {
        if (!mediaUrl || !mediaUrl.includes('res.cloudinary.com')) return;
        
        const parts = mediaUrl.split('/');
        const uploadIndex = parts.findIndex(p => p === 'upload');
        if (uploadIndex !== -1 && parts.length > uploadIndex + 2) {
            // Reconstruct public_id by taking everything after version folder
            // e.g., v1235123/folder/file.jpg -> folder/file.jpg
            let publicId = parts.slice(uploadIndex + 2).join('/');
            
            // Remove the extension
            publicId = publicId.substring(0, publicId.lastIndexOf('.')) || publicId;

            // Since resourceType matters for deletion, try deleting across types
            await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => {});
            await cloudinary.uploader.destroy(publicId, { resource_type: 'video' }).catch(() => {});
            await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }).catch(() => {});
        }
    } catch (error) {
        console.error("Cloudinary delete error:", error);
    }
};

module.exports = { cloudinary, upload, uploadToCloudinary, deleteFromCloudinary };
