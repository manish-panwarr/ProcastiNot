import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuTrash, LuPen, LuBriefcase, LuShield } from 'react-icons/lu';
import { FiPauseCircle, FiPlayCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { getAvatarUrl } from '../../utils/helper';
import Modal from '../../components/Modal';
import Input from '../../components/inputs/Input';
import SelectDropdown from '../../components/inputs/SelectDropdown';
import CustomPieChart from '../../components/Charts/CustomPieChart';
import CustomBarChart from '../../components/Charts/CustomBarChart';
import { UserContext } from '../../context/userContext';
import { useContext } from 'react';

const UserDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const { user } = useContext(UserContext);

    const isManager = user?.role === "manager";

    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [assignedTasks, setAssignedTasks] = useState([]);
    const [workingUnder, setWorkingUnder] = useState([]);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: "",
        email: "",
        department: "",
        role: "",
    });

    const getUserDetails = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(API_PATHS.USERS.GET_USER_BY_ID(id));
            if (response.data) {
                setUserData(response.data.user);
                setAssignedTasks(response.data.tasks || []);
                setWorkingUnder(response.data.admins || []);

                setEditFormData({
                    name: response.data.user.name,
                    email: response.data.user.email,
                    department: response.data.user.department,
                    role: response.data.user.role,
                });
            }
        } catch (error) {
            console.error("Error fetching user details:", error);
            toast.error("Failed to load user details");
            navigate('/admin/users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            getUserDetails();
        }
    }, [id]);

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteUser = async () => {

        try {
            await axiosInstance.delete(API_PATHS.USERS.DELETE_USER(id));
            toast.success("User deleted successfully");
            navigate('/admin/users');
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("Failed to delete user");
        }
    };

    const handleUpdateUser = async () => {
        try {
            const response = await axiosInstance.put(API_PATHS.USERS.UPDATE_USER(id), editFormData);
            if (response.data) {
                setUserData({ ...userData, ...response.data });
                toast.success("User updated successfully");
                setIsEditModalOpen(false);
            }
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("Failed to update user");
        }
    };

    const toggleHoldStatus = async () => {
        try {
            const newStatus = !userData.isOnHold;
            const response = await axiosInstance.put(API_PATHS.USERS.UPDATE_USER(id), {
                isOnHold: newStatus
            });
            if (response.data) {
                setUserData({ ...userData, isOnHold: newStatus });
                toast.success(newStatus ? "User put on HOLD" : "User released from HOLD");
            }
        } catch (error) {
            console.error("Error updating hold status:", error);
            toast.error("Failed to update hold status");
        }
    };

    // Prepare Chart Data
    const getTaskStatusData = () => {
        if (!assignedTasks.length) return [];
        const statusCounts = { Pending: 0, "In Progress": 0, Completed: 0 };
        assignedTasks.forEach(task => {
            if (statusCounts[task.status] !== undefined) statusCounts[task.status]++;
        });
        return Object.keys(statusCounts).map(status => ({
            status,
            count: statusCounts[status]
        }));
    };

    const getTaskPriorityData = () => {
        if (!assignedTasks.length) return [];
        const priorityCounts = { Low: 0, Medium: 0, High: 0 };
        assignedTasks.forEach(task => {
            if (priorityCounts[task.priority] !== undefined) priorityCounts[task.priority]++;
        });
        return Object.keys(priorityCounts).map(priority => ({
            priority,
            count: priorityCounts[priority]
        }));
    };

    if (loading) {
        return (
            <DashboardLayout activeMenu="Team Members">
                <div className="flex items-center justify-center h-screen">
                    <p>Loading user details...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!userData) {
        return (
            <DashboardLayout activeMenu="Team Members">
                <div className="p-5">
                    <h2 className="text-xl font-medium text-red-500">User not found</h2>
                    <button onClick={() => navigate('/admin/users')} className="mt-4 text-blue-500 underline">
                        Back to Team Members
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout activeMenu="Team Members">
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate('/admin/users')} className="text-gray-500 hover:text-gray-700 text-sm">
                            &larr; Back to Users
                        </button>
                        <h1 className="text-2xl font-bold text-gray-800">User Details</h1>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={toggleHoldStatus}
                            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors ${userData.isOnHold ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"}`}
                        >
                            {userData.isOnHold ? <FiPlayCircle className="w-4 h-4" /> : <FiPauseCircle className="w-4 h-4" />}
                            {userData.isOnHold ? "Release Hold" : "Put on Hold"}
                        </button>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <LuPen className="w-4 h-4" /> Edit Profile
                        </button>
                        <button
                            onClick={handleDeleteClick}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                            <LuTrash className="w-4 h-4" /> Delete User
                        </button>
                    </div>
                </div>

                {/* Profile Card & Hold Alert */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                            <div className="relative">
                                <img
                                    src={getAvatarUrl(userData.profileImageUrl, userData.name)}
                                    alt={userData.name}
                                    className={`w-32 h-32 rounded-full border-4 object-cover shadow-sm ${userData.isOnHold ? "border-red-500 grayscale" : "border-gray-50"}`}
                                />
                                {userData.isOnHold && (
                                    <div className="absolute -bottom-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                        ON HOLD
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-4 w-full text-center md:text-left">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{userData.name}</h2>
                                    <p className="text-gray-500">{userData.email}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-3 md:justify-start justify-center text-gray-700">
                                        <LuBriefcase className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="text-xs text-gray-500">Department</p>
                                            <p className="font-medium">{userData.department || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 md:justify-start justify-center text-gray-700">
                                        <LuShield className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="text-xs text-gray-500">Role</p>
                                            <p className="font-medium capitalize">{userData.role}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {userData.isOnHold && (
                            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
                                <strong>Important:</strong> This user is currently on <strong>HOLD</strong>. No new tasks can be assigned to them until they complete their pending tasks or are manually released.
                            </div>
                        )}
                    </div>

                    {/* Stats Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-center gap-4">
                        <div className="text-center">
                            <p className="text-xl font-bold text-gray-800">{assignedTasks.length}</p>
                            <p className="text-gray-500 text-sm">Total Tasks Assigned</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center mt-2">
                            <div className="bg-yellow-50 p-2 rounded">
                                <p className="text-xs text-yellow-700 font-bold">Pending</p>
                                <p className="text-lg font-semibold text-yellow-800">
                                    {assignedTasks.filter(t => t.status === "Pending").length}
                                </p>
                            </div>
                            <div className="bg-blue-50 p-2 rounded">
                                <p className="text-xs text-blue-700 font-bold">In Prog</p>
                                <p className="text-lg font-semibold text-blue-800">
                                    {assignedTasks.filter(t => t.status === "In Progress").length}
                                </p>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                                <p className="text-xs text-green-700 font-bold">Done</p>
                                <p className="text-lg font-semibold text-green-800">
                                    {assignedTasks.filter(t => t.status === "Completed").length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Task Status Distribution</h3>
                        {assignedTasks.length > 0 ? (
                            <CustomPieChart data={getTaskStatusData()} />
                        ) : (
                            <p className="text-gray-400 text-center py-10">No task data available.</p>
                        )}
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Task Priority Breakdown</h3>
                        {assignedTasks.length > 0 ? (
                            <CustomBarChart data={getTaskPriorityData()} />
                        ) : (
                            <p className="text-gray-400 text-center py-10">No task data available.</p>
                        )}
                    </div>
                </div>

                {/* Working Under Section */}
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        Working Under
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {workingUnder.length} Admins
                        </span>
                    </h3>

                    {workingUnder.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {workingUnder.map(admin => (
                                <div key={admin._id} className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-4 shadow-sm">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                                        {admin.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{admin.name}</p>
                                        <p className="text-xs text-gray-500">{admin.email}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center text-gray-500">
                            No admins have assigned tasks to this user yet.
                        </div>
                    )}
                </div>

                {/* Edit Modal */}
                <Modal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title="Edit User Profile"
                >
                    <div className="space-y-4">
                        <Input
                            label="Full Name"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            placeholder="Enter full name"
                        />
                        <Input
                            label="Email Address"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                            placeholder="Enter email address"
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                            <SelectDropdown
                                options={[
                                    { label: "Select Department", value: "" },
                                    { label: "HR", value: "HR" },
                                    { label: "IT", value: "IT" },
                                    { label: "Security", value: "Security" },
                                    { label: "Management", value: "Management" },
                                    { label: "Other", value: "Other" },
                                ]}
                                value={editFormData.department}
                                onChange={(val) => setEditFormData({ ...editFormData, department: val })}
                            />
                        </div>

                        {/* Only Manager can change role */}
                        {isManager ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <SelectDropdown
                                    options={[
                                        { label: "Member", value: "member" },
                                        { label: "Admin", value: "admin" },
                                        { label: "Manager", value: "manager" },
                                    ]}
                                    value={editFormData.role}
                                    onChange={(val) => setEditFormData({ ...editFormData, role: val })}
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <input
                                    type="text"
                                    value={editFormData.role}
                                    readOnly
                                    disabled
                                    className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 capitalize"
                                />
                            </div>
                        )}

                        <div className="flex justify-end pt-4 gap-2">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateUser}
                                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    title="Confirm Delete User"
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Are you sure you want to delete <strong>{userData.name}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end pt-4 gap-2">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteUser}
                                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        </DashboardLayout>
    );
};

export default UserDetails;
