const jwt = require("jsonwebtoken");;
const User = require("../models/User");

// Middleware to protect routes

const protect = async (req, res, next) => {
    try {
        let token = req.headers.authorization;
        if (!token || !token.startsWith("Bearer")) {
            return res.status(401).json({ message: "Not authorized, no token" });
        }
        token = token.split(" ")[1]; // Extracting token from "Bearer <token>"
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select("-password");

        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, user not found" });
        }

        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: "Not authorized, no token, token failed" });
    }
};


// Middleware to check if user is admin

const adminOnly = (req, res, next) => {
    if (req.user && (req.user.role === "admin" || req.user.role === "manager")) {
        next();
    } else {
        res.status(403).json({ message: "Access denied,Not authorized as admin" });
    }
};


// Handle file upload 

const uploadImage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.status(200).json({ imageUrl });
}


module.exports = { protect, adminOnly };
