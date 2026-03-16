import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../../context/userContext";
import { useNavigate } from "react-router-dom";
import { SIDE_MENU_DATA, SIDE_MENU_USER_DATA } from "../../utils/data";
import { MdOutlineEdit } from "react-icons/md";
import UpdateUserModal from "../Cards/UpdateUserModal";
import { getAvatarUrl } from "../../utils/helper";
import { BsStopwatch } from "react-icons/bs";

const SideMenu = ({ activeMenu, isMobile = false }) => {
    const { user, clearUser, updateUser } = useContext(UserContext);
    const [sideMenuData, setSideMenuData] = useState([]);
    const [openUpdateModal, setOpenUpdateModal] = useState(false);

    const navigate = useNavigate();

    const handleClick = (route) => {
        if (route === "/logout") {
            handleLogout();
            return;
        }

        navigate(route);
    };

    const handleLogout = () => {
        localStorage.clear();
        clearUser();
        navigate("/login");
    };

    const handleUserUpdate = (updatedUser) => {
        updateUser(updatedUser);
        setOpenUpdateModal(false);
    };

    useEffect(() => {
        if (!user) return;

        let menuData =
            user.role === "admin" || user.role === "manager"
                ? [...SIDE_MENU_DATA]
                : [...SIDE_MENU_USER_DATA];

        if (user.role === "manager") {
            menuData = menuData.map((item) =>
                item.label === "Dashboard"
                    ? { ...item, path: "/manager/dashboard" }
                    : item
            );
        }

        setSideMenuData(menuData);
    }, [user]);

    return (
        <>
            <div
                className={`${isMobile
                    ? "w-full flex flex-col"
                    : "w-full h-full pt-4"
                    }  flex-col overflow-y-auto `}
            >

                {/* User Section */}
                <div className="flex flex-col items-center justify-center mb-7 pt-10">
                    <div className="relative">
                        <img
                            src={getAvatarUrl(user?.profileImageUrl, user?.name)}
                            alt="Profile"
                            className="w-26 h-26 bg-slate-400 rounded-full object-cover"
                        />

                        <button
                            className="absolute bottom-0 right-0 h-7 w-7 bg-blue-500 rounded-full text-white flex items-center justify-center hover:bg-blue-600"
                            onClick={() => setOpenUpdateModal(true)}
                        >
                            <MdOutlineEdit className="text-sm" />
                        </button>
                    </div>

                    {user?.role === "admin" && (
                        <div className="text-[10px] font-medium text-white bg-blue-600 px-3 py-0.5 rounded mt-1">
                            Admin
                        </div>
                    )}

                    {user?.role === "manager" && (
                        <div className="text-[10px] font-medium text-white bg-green-500 px-3 py-0.5 rounded mt-1">
                            Manager
                        </div>
                    )}

                    <h5 className="text-gray-900 font-medium mt-3">
                        {user?.name || ""}
                    </h5>

                    <p className="text-xs text-gray-500">{user?.email || ""}</p>
                </div>

                {/* Menu */}
                <div className="flex flex-col">
                    {sideMenuData.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => handleClick(item.path)}
                            className={`w-full flex items-center gap-4 text-sm py-3 px-6 mb-1 transition ${activeMenu === item.label
                                ? "text-blue-600 bg-blue-50 border-r-4 border-blue-600"
                                : "text-gray-700 hover:bg-gray-100"
                                }`}
                        >
                            <item.icon className="text-xl" />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <UpdateUserModal
                isOpen={openUpdateModal}
                onClose={() => setOpenUpdateModal(false)}
                user={user}
                onUpdate={handleUserUpdate}
            />
        </>
    );
};

export default SideMenu;