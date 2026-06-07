require("dotenv").config();
const mongoose = require("mongoose");

// DNS override — ensures SRV resolution works in cloud environments (Render, Railway)
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            // Connection pool: allows up to 10 concurrent MongoDB operations
            // Prevents connection exhaustion under high load
            maxPoolSize: 10,
            minPoolSize: 2,

            // How long a connection can remain idle before being closed
            maxIdleTimeMS: 30000,

            // Timeout for establishing initial connection
            serverSelectionTimeoutMS: 10000,

            // Timeout for socket operations (reads/writes)
            socketTimeoutMS: 45000,
        });
        console.log("[MongoDB] Connected successfully.");
    } catch (error) {
        console.error("[MongoDB] Connection error:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;