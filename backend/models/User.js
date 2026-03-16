const mongoose = require("mongoose");


const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profileImageUrl: { type: String, default: null },
    department: { type: String, default: "" },
    role: { type: String, enum: ["admin", "member", "manager"], default: "member" }, // Role-based access control
    isOnHold: { type: Boolean, default: false }, // If true, user cannot be assigned new tasks
    mobile: { type: String, default: "" }, // Optional mobile number for profile info panel
    bio: { type: String, default: "" }, // Short bio / more info
},
    { timestamps: true });

module.exports = mongoose.model("User", UserSchema);