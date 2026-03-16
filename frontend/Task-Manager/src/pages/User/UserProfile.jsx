import React, { useContext, useState } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { UserContext } from '../../context/userContext';
import { getAvatarUrl, getInitials } from '../../utils/helper';
import { MdOutlineEdit, MdOutlineEmail, MdOutlineWorkOutline, MdOutlineBadge } from "react-icons/md";
import UpdateUserModal from '../../components/Cards/UpdateUserModal';

const UserProfile = () => {
    const { user, updateUser } = useContext(UserContext);
    const [openUpdateModal, setOpenUpdateModal] = useState(false);

    const handleUserUpdate = (updatedUser) => {
        updateUser(updatedUser);
        setOpenUpdateModal(false);
    };

    if (!user) return null;

    return (
        <DashboardLayout activeMenu="Profile">
            <div className="max-w-4xl mx-auto my-10">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                        <div className="absolute -bottom-16 left-8">
                            <div className="relative">
                                <img
                                    src={getAvatarUrl(user.profileImageUrl, user.name)}
                                    alt={user.name}
                                    className="w-32 h-32 rounded-full border-4 border-white object-cover bg-gray-200"
                                />
                                <button
                                    className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-md hover:bg-gray-50 text-gray-700 transition"
                                    onClick={() => setOpenUpdateModal(true)}
                                >
                                    <MdOutlineEdit />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-20 px-8 pb-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                                <p className="text-gray-500">{user.email}</p>
                            </div>
                            <button
                                onClick={() => setOpenUpdateModal(true)}
                                className="card-btn"
                            >
                                <MdOutlineEdit className="mr-2" /> Edit Profile
                            </button>
                        </div>

                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Info */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Personal Information</h3>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <MdOutlineBadge className="text-xl text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Full Name</p>
                                        <p className="font-medium">{user.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <MdOutlineEmail className="text-xl text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Email Address</p>
                                        <p className="font-medium">{user.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Work Info */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Work Information</h3>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <MdOutlineWorkOutline className="text-xl text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Department</p>
                                        <p className="font-medium">
                                            {user.department ? (
                                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-sm">
                                                    {user.department}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 italic">Not Assigned</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <MdOutlineBadge className="text-xl text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Role</p>
                                        <p className="font-medium capitalize">{user.role}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <UpdateUserModal
                isOpen={openUpdateModal}
                onClose={() => setOpenUpdateModal(false)}
                user={user}
                onUpdate={handleUserUpdate}
            />
        </DashboardLayout>
    );
};

export default UserProfile;
