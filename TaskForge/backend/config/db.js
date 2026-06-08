require("dotenv").config();
const mongoose = require("mongoose");

// DNS override — ensures SRV resolution works in cloud environments (Render, Railway)
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 30000,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log("[MongoDB] Connected successfully.");
    } catch (error) {
        console.error("[MongoDB] Connection error:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;