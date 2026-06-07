export const BASE_URL =
    import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL
        : "https://procastinot-2jjb.onrender.com";


export const API_PATHS = {
    AUTH: {
        LOGIN: "/api/auth/login", //@desc Authenticate user and return JWT token
        SIGNUP: "/api/auth/register", //@desc Register a new user (Admin or Member)
        GET_PROFILE: "/api/auth/profile", //@desc Get logged-in user details
    },

    USERS: {
        GET_ALL_USERS: "/api/users", //@desc Get all users (Admin only)
        GET_USER_BY_ID: (userId) => `/api/users/${userId}`, //@desc Get user by ID (Admin only)
        CREATE_USER: "/api/users", //@desc Create a new user (Admin only)
        UPDATE_USER: (userId) => `/api/users/${userId}`, //@desc Update a user (Admin only)
        DELETE_USER: (userId) => `/api/users/${userId}`, //@desc Delete a user (Admin only)
        GET_MANAGER_DASHBOARD_STATS: "/api/users/manager-dashboard-stats", //@desc Get manager dashboard stats
    },

    TASKS: {
        GET_DASHBOARD_DATA: "/api/tasks/dashboard-data", //@desc Get dashboard data (Admin only)
        GET_USER_DASHBOARD_DATA: "/api/tasks/user-dashboard-data", //@desc Get user dashboard data (Admin only)

        GET_ALL_TASKS: "/api/tasks", //@desc Get all tasks (Admin only)
        GET_TASK_BY_ID: (taskId) => `/api/tasks/${taskId}`, //@desc Get task by ID (Admin only)
        CREATE_TASK: "/api/tasks", //@desc Create a new task (Admin only)
        UPDATE_TASK: (taskId) => `/api/tasks/${taskId}`, //@desc Update a task (Admin only)
        DELETE_TASK: (taskId) => `/api/tasks/${taskId}`, //@desc Delete a task (Admin only)

        UPDATE_TASK_STATUS: (taskId) => `/api/tasks/${taskId}/status`, //@desc Update task status (Admin only)
        UPDATE_TODO_CHECKLIST: (taskId) => `/api/tasks/${taskId}/todo`, //@desc Update todo checklist (Admin only)
    },


    REPORTS: {
        EXPORT_TASKS: "/api/reports/export/tasks", //@desc Export tasks to CSV (Admin only)
        EXPORT_USERS: "/api/reports/export/users", //@desc Export users to CSV (Admin only)
    },

    IMAGE: {
        UPLOAD_IMAGE: "api/auth/upload-image", //@desc Upload image (Admin only)
    }
};

