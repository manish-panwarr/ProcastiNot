import React, { useState, useEffect } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { getAvatarUrl } from "../../utils/helper";
import { LuUsers, LuSearch } from "react-icons/lu";
import Modal from "../Modal";
import { useNavigate } from "react-router-dom";
import AvatarGroup from "../AvatarGroup";

const SelectUsers = ({ selectedUsers, setSelectedUsers, ignoreRole }) => {

    const navigate = useNavigate();
    const [allUsers, setAllUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tempSelectedUsers, setTempSelectedUsers] = useState([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");

    const getAllUsers = async () => {
        try {
            const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
            let users = [];
            if (response.data && Array.isArray(response.data)) {
                users = response.data;
            } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
                users = response.data.data;
            }

            if (ignoreRole) {
                users = users.filter(user => user.role?.toLowerCase() !== ignoreRole.toLowerCase());
            }

            setAllUsers(users);
        } catch (error) {
            console.log("Error fetching users", error);
        }
    };

    const toggleUserSelection = (userId) => {
        setTempSelectedUsers((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
    };

    const handleAssign = () => {
        setSelectedUsers(tempSelectedUsers);
        setIsModalOpen(false);
    };

    const selectedUsersAvatars = allUsers.filter((user) => selectedUsers.includes(user._id)).map((user) => getAvatarUrl(user.profileImageUrl, user.name));

    useEffect(() => {
        getAllUsers();
        setTempSelectedUsers(selectedUsers);
    }, [selectedUsers]);


    const filteredUsers = allUsers.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = departmentFilter
            ? (departmentFilter === "Other"
                ? (!user.department || !["Management", "HR", "IT", "Technical", "UI/UX", "Marketing", "Sales", "Security"].includes(user.department))
                : user.department === departmentFilter)
            : true;
        return matchesSearch && matchesDept;
    });

    const handleSelectAll = () => {
        const uniqueIds = new Set([...tempSelectedUsers, ...filteredUsers.map(u => u._id)]);
        setTempSelectedUsers(Array.from(uniqueIds));
    };

    const handleClearSelection = () => {
        setTempSelectedUsers([]);
    };


    return (
        <div className="space-y-4 mt-2">
            {selectedUsersAvatars.length === 0 && (
                <button className="card-btn" onClick={() => setIsModalOpen(true)}>
                    <LuUsers className="text-sm" />Add Members
                </button>
            )}

            {selectedUsersAvatars.length > 0 && (
                <div className="cursor-pointer" onClick={() => setIsModalOpen(true)}>
                    <AvatarGroup avatars={selectedUsersAvatars} maxVisible={3} />
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Select Users"
            >
                <div className="flex flex-col gap-3 mb-4">
                    {/* Search and Filter */}
                    <div className="flex gap-2">
                        <div className="flex-1 flex items-center px-3 py-2 border rounded-lg bg-gray-50">
                            <LuSearch className="text-gray-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Search by name or email"
                                className="bg-transparent border-none outline-none text-sm w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <select
                            className="px-3 py-2 border rounded-lg text-sm bg-gray-50 outline-none"
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                        >
                            <option value="">All Departments</option>
                            <option value="Management">Management</option>
                            <option value="HR">HR</option>
                            <option value="IT">IT</option>
                            <option value="Technical">Technical</option>
                            <option value="UI/UX">UI/UX</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Sales">Sales</option>
                            <option value="Security">Security</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Bulk Actions */}
                    <div className="flex justify-between items-center text-sm px-1">
                        <span className="text-gray-500">{filteredUsers.length} users found</span>
                        <div className="flex gap-3">
                            <button
                                className="text-blue-600 hover:text-blue-800 font-medium"
                                onClick={handleSelectAll}
                            >
                                Select All
                            </button>
                            <button
                                className="text-gray-500 hover:text-gray-700"
                                onClick={handleClearSelection}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 h-[50vh] overflow-y-auto">
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                            <div
                                className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer w-full text-left transition-all ${tempSelectedUsers.includes(user._id)
                                    ? "border-primary/50 bg-blue-50/30 ring-1 ring-blue-100"
                                    : "border-gray-200 hover:border-blue-100 hover:shadow-sm"
                                    }`}
                                key={user._id}
                                onClick={() => toggleUserSelection(user._id)}
                            >
                                <img
                                    src={getAvatarUrl(user.profileImageUrl, user.name)}
                                    alt={user.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div className="flex-1">
                                    <p className="font-medium text-gray-700 text-sm">{user.name}</p>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                    {user.department && (
                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                                            {user.department}
                                        </span>
                                    )}
                                </div>

                                <input
                                    type="checkbox"
                                    className="w-4 h-4 accent-primary cursor-pointer pointer-events-none"
                                    checked={tempSelectedUsers.includes(user._id)}
                                    readOnly
                                />
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-400 py-10">No users found</p>
                    )}
                </div>

                <div className="flex justify-between items-center mt-4 border-t pt-4">
                    <p className="text-sm text-gray-600">
                        <span className="font-medium text-primary">{tempSelectedUsers.length}</span> selected
                    </p>
                    <div className="flex gap-3">
                        <button className="card-btn" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </button>
                        <button className="card-btn-fill" onClick={handleAssign}>
                            Save
                        </button>
                    </div>
                </div>



            </Modal>

        </div>
    );
};

export default SelectUsers;