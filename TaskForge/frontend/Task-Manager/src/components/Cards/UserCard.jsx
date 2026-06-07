import React from "react";
import { getAvatarUrl } from "../../utils/helper";

const UserCard = ({ userInfo }) => {
    return (
        <div className="user-card p-3 hover:shadow-lg hover:border-gray-300 hover:scale-102 transition-all duration-300 ease-in-out cursor-pointer border rounded-lg border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src={getAvatarUrl(userInfo?.profileImageUrl, userInfo?.name)} alt={`Avatar of ${userInfo?.name}`}
                        className="w-14 h-14 rounded-full border-2 border-white object-cover"
                        loading="lazy"
                    />

                    <div>
                        <p className="text-sm font-medium">{userInfo?.name}</p>
                        <p className="text-xs text-gray-500">{userInfo?.email}</p>
                        <p className="text-xs text-gray-500">{userInfo?.role}</p>
                        {userInfo?.department && <p className="text-xs text-blue-500 font-medium">{userInfo?.department}</p>}
                    </div>
                </div>
            </div>

            <div className="flex items-end gap-3 mt-5">
                <StatCard
                    label="Pending"
                    count={userInfo?.pendingTasks || 0}
                    status="Pending"
                />
                <StatCard
                    label="In Progress"
                    count={userInfo?.inProgressTasks || 0}
                    status="In Progress"
                />
                <StatCard
                    label="Completed"
                    count={userInfo?.completedTasks || 0}
                    status="Completed"
                />
            </div>
        </div>
    );
};

export default UserCard;

const StatCard = ({ label, count, status }) => {

    const getStatusTagColor = () => {
        switch (status) {
            case "Pending":
                return "bg-yellow-100 text-yellow-800"
            case "In Progress":
                return "bg-blue-100 text-blue-800"
            case "Completed":
                return "bg-green-100 text-green-800"
            default:
                return "bg-gray-100 text-gray-800"
        }
    };

    return (
        <div className={`flex-1 text-[10px] font-medium text-center ${getStatusTagColor()} px-4 py-1 rounded`}>
            <span className={`text-[12px] font-medium text-center ${getStatusTagColor()}`}>
                {count} <br /> {label}
            </span>
        </div>
    )
}