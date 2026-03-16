export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// utils/apiPaths.js

export const API_PATHS = {
    AUTH: {
        LOGIN: "/api/auth/login", // Authenticate user and return JWT token
        SIGNUP: "/api/auth/register", // Register a new user (Admin or Member)
        GET_PROFILE: "/api/auth/profile", // Get logged-in user details
    },

    USERS: {
        GET_ALL_USERS: "/api/users", // Get all users (Admin only)
        GET_USER_BY_ID: (userId) => `/api/users/${userId}`, // Get user by ID (Admin only)
        CREATE_USER: "/api/users", // Create a new user (Admin only)
        UPDATE_USER: (userId) => `/api/users/${userId}`, // Update a user (Admin only)
        DELETE_USER: (userId) => `/api/users/${userId}`, // Delete a user (Admin only)
        GET_MANAGER_DASHBOARD_STATS: "/api/users/manager-dashboard-stats", // Get manager dashboard stats
    },

    TASKS: {
        GET_DASHBOARD_DATA: "/api/tasks/dashboard-data", // Get dashboard data (Admin only)
        GET_USER_DASHBOARD_DATA: "/api/tasks/user-dashboard-data", // Get user dashboard data (Admin only)

        GET_ALL_TASKS: "/api/tasks", // Get all tasks (Admin only)
        GET_TASK_BY_ID: (taskId) => `/api/tasks/${taskId}`, // Get task by ID (Admin only)
        CREATE_TASK: "/api/tasks", // Create a new task (Admin only)
        UPDATE_TASK: (taskId) => `/api/tasks/${taskId}`, // Update a task (Admin only)
        DELETE_TASK: (taskId) => `/api/tasks/${taskId}`, // Delete a task (Admin only)

        UPDATE_TASK_STATUS: (taskId) => `/api/tasks/${taskId}/status`, // Update task status (Admin only)
        UPDATE_TODO_CHECKLIST: (taskId) => `/api/tasks/${taskId}/todo`, // Update todo checklist (Admin only)
    },


    REPORTS: {
        EXPORT_TASKS: "/api/reports/export/tasks", // Export tasks to CSV (Admin only)
        EXPORT_USERS: "/api/reports/export/users", // Export users to CSV (Admin only)
    },

    IMAGE: {
        UPLOAD_IMAGE: "api/auth/upload-image",
    }
};

