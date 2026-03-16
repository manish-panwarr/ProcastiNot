import React from "react";
import Progress from "../layouts/Progress";
import AvatarGroup from "../AvatarGroup";
import { LuPaperclip } from "react-icons/lu";
import moment from "moment";
import { getAvatarUrl } from "../../utils/helper";

const TaskCard = (props) => {
    const { title, description, status, progress, createdAt, dueDate, assignedTo, attachmentCount, completedTodoCount, todoChecklist, onClick, priority } = props;

    const getStatusTagColor = () => {
        switch (status) {
            case "Pending":
                return "bg-yellow-50 text-yellow-700 border-yellow-200";
            case "In Progress":
                return "bg-blue-50 text-blue-700 border-blue-200";
            case "Completed":
                return "bg-green-50 text-green-700 border-green-200";
            default:
                return "bg-gray-50 text-gray-700 border-gray-200";
        }
    };

    const getPriorityTagColor = (p) => {
        const pr = p ? p.toLowerCase() : "normal";
        switch (pr) {
            case "low":
                return "bg-green-50 text-green-700 border-green-200";
            case "medium":
                return "bg-yellow-50 text-yellow-700 border-yellow-200";
            case "high":
                return "bg-red-50 text-red-700 border-red-200";
            default:
                return "bg-gray-50 text-gray-700 border-gray-200";
        }
    };


    return (
        <div className="bg-white rounded-xl py-3 shadow-md shadow-gray-100 border border-gray-200/50 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-102 "
            onClick={onClick}>
            <div className="flex items-end gap-3 px-5">
                <div className={`text-[11px] font-medium ${getStatusTagColor()} px-4 py-0.5 rounded`}>
                    {status}
                </div>
                <div className={`text-[11px] font-medium ${getPriorityTagColor(priority)} px-4 py-0.5 rounded`}>
                    {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : "Normal"}
                </div>
            </div>


            <div className={`px-4 border-l-[3px] ${status === "In Progress"
                ? "border-cyan-500" : status === "Completed" ? "border-indigo-500" : "border-violet-500"
                }`}
            >
                <p className="text-sm font-medium text-gray-800 mt-4 line-clamp-2">{title}</p>
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-[18px]">{description}</p>

                <p className="text-[13px] text-gray-700/80 font-medium mt-2 mb-2 leading-[18px]">Task Done:{" "}
                    <span className="font-semibold text-gray-700">{completedTodoCount}/{todoChecklist?.length || 0}</span>
                </p>

                <Progress progress={progress} status={status} />
            </div>

            <div className="px-4">
                <div className="flex items-center justify-between my-1">
                    <div>
                        <label className="text-xs text-gray-500">Start Date</label>
                        <p className="text-[13px] font-medium text-gray-900">
                            {moment(createdAt).format("Do MMM YYYY")}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500">Due Date</label>
                        <p className="text-[13px] font-medium text-gray-900">
                            {moment(dueDate).format("Do MMM YYYY")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                    <AvatarGroup avatars={assignedTo?.map(u => getAvatarUrl(u?.profileImageUrl, u?.name)) || []} />

                    {attachmentCount > 0 && (
                        <div className="flex items-center gap-2 bg-blue-50 px-2.5 py-1.5 rounded-lg ">
                            <LuPaperclip className="text-primary" />{" "}
                            <span className="text-xs text-gray-900">{attachmentCount}</span>
                        </div>
                    )}

                </div>
            </div>

        </div>
    );
};

export default TaskCard;