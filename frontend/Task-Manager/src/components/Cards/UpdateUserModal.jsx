import React, { useState, useEffect } from "react";
import Modal from "../Modal";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import { MdOutlineEdit } from "react-icons/md";

const UpdateUserModal = ({ isOpen, onClose, user, onUpdate }) => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("");
    const [department, setDepartment] = useState("");
    const [profileImageUrl, setProfileImageUrl] = useState("");
    const [password, setPassword] = useState(""); // Optional: Only if user wants to change it

    const [selectedImage, setSelectedImage] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");
            setRole(user.role || "");
            setDepartment(user.department || "");
            setProfileImageUrl(user.profileImageUrl || "");
            setPassword("");
        }
    }, [user, isOpen]);

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImageUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };


    const handleUploadImage = async () => {
        if (!selectedImage) {
            return profileImageUrl;
        }

        const formData = new FormData();
        formData.append("image", selectedImage);

        try {
            setUploading(true);
            const response = await axiosInstance.post(API_PATHS.IMAGE.UPLOAD_IMAGE, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            setUploading(false);
            return response.data.imageUrl;
        } catch (error) {
            setUploading(false);
            console.error("Image upload failed:", error);
            toast.error("Failed to upload image");
            return null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let imageUrl = profileImageUrl;
        if (selectedImage) {
            const uploadedUrl = await handleUploadImage();
            if (uploadedUrl) {
                imageUrl = uploadedUrl;
            } else {
                return;
            }
        }

        try {
            const payload = {
                name,
                email,
                department,
                profileImageUrl: imageUrl,
            };

            if (password) {
                payload.password = password;
            }

            const response = await axiosInstance.put(API_PATHS.AUTH.GET_PROFILE, payload);

            if (response.data && response.data.message) {
                toast.success(response.data.message);
            } else {
                toast.success("Profile updated successfully");
            }

            if (onUpdate) {
                onUpdate(response.data);
            }
            onClose();
        } catch (error) {
            console.error("Update failed:", error);
            toast.error(error.response?.data?.message || "Failed to update profile");
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Update Profile"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-24 h-24">
                        <img
                            src={profileImageUrl || "https://via.placeholder.com/150"}
                            alt="Profile"
                            className="w-full h-full rounded-full object-cover border-2 border-gray-200"
                        />
                        <label
                            htmlFor="profileImageInput"
                            className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition shadow-md"
                        >
                            <MdOutlineEdit className="text-lg" />
                        </label>
                        <input
                            type="file"
                            id="profileImageInput"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border-gray-300 border px-3 py-2 text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border-gray-300 border px-3 py-2 text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="john@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <select
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full rounded-lg border-gray-300 border px-3 py-2 text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Select Department</option>
                            <option value="HR">HR</option>
                            <option value="IT">IT</option>
                            <option value="Security">Security</option>
                            <option value="Electrician">Electrician</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password <span className="text-gray-400 font-normal">(Leave blank to keep current)</span></label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border-gray-300 border px-3 py-2 text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={uploading}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? "Uploading..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default UpdateUserModal;
