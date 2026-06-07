import axios from "axios";
import { BASE_URL } from "./apiPaths";

//@desc : If VITE_API_URL is missing or localhost in production builds on Vercel,
//@desc : fall back to the actual Render backend URL so API calls go to the right place.
const API_BASE = BASE_URL;

//@desc : Create axios instance
//@return : Axios instance
const axiosInstance = axios.create({
    baseURL: API_BASE,
    timeout: 30000, // 30s default timeout
    headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
    },
});

//@desc: Request Interceptor
//@why : To attach the JWT token to the request header no manual work of attatching token every time .
//@return : Promise of config 
axiosInstance.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem("token");
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Auto-increase timeout for file uploads (multipart/form-data)
        const contentType = config.headers["Content-Type"] || config.headers["content-type"] || "";
        if (contentType.includes("multipart/form-data") || config.data instanceof FormData) {
            config.timeout = 120000; // 2 minutes for uploads
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

//@desc: Response Interceptor
//@why : If response is 401 redirect to login page automatically and if timeout occur show error message.
//@return : Promise of response 
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401 && !error.config?.url?.includes("/login")) {
            window.location.href = "/login";
        } else if (error.code === "ECONNABORTED") {
            console.error("Request timeout. Please try again.");
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
