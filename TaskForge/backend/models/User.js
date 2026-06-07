const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profileImageUrl: { type: String, default: "" },
    department: { type: String, default: "" },
    role: { type: String, enum: ["admin", "member", "manager"], default: "member" },
    isOnHold: { type: Boolean, default: false },
    mobile: { type: String, default: "" },
    bio: { type: String, default: "" },
},
    { timestamps: true });


//  INDEXES

// Role-based queries: getManagerDashboardStats counts per role (3 countDocuments → 1 aggregation)
UserSchema.index({ role: 1 }, { background: true });

// Department-based task filtering in getTasks: User.find({ department })
UserSchema.index({ department: 1 }, { background: true });

// Full-text search on name (chat user search, admin search)
UserSchema.index({ name: "text" }, { background: true });

module.exports = mongoose.model("User", UserSchema);