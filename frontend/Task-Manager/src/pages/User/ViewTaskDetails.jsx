import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import AvatarGroup from "../../components/AvatarGroup";
import { getAvatarUrl } from "../../utils/helper";
import { LuFile, LuImage, LuLink, LuVideo } from "react-icons/lu";
import ReactMarkdown from "react-markdown";
import moment from "moment";
import toast from "react-hot-toast";



const ViewTaskDetails = () => {

    const { id } = useParams();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getStatusTagColor = (status) => {
        switch (status) {
            case "Pending":
                return "bg-amber-100 text-amber-600";
            case "In Progress":
                return "bg-blue-100 text-blue-600";
            case "Completed":
                return "bg-green-100 text-green-600";
            default:
                return "bg-gray-100 text-gray-600";
        }
    };

    // get Task info by ID
    const getTaskDetailsByID = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(API_PATHS.TASKS.GET_TASK_BY_ID(id));
            if (response.data) {
                const taskInfo = response.data;
                setTask(taskInfo);
            }
        } catch (error) {
            console.error("Error fetching task details:", error);
            setError("Task not found or failed to load");
            toast.error("Task not found or failed to load");
        } finally {
            setLoading(false);
        }
    };


    const updateTodoChecklist = async (updatedChecklist) => {
        try {
            const response = await axiosInstance.put(API_PATHS.TASKS.UPDATE_TODO_CHECKLIST(id), {
                todoChecklist: updatedChecklist,
            });

            if (response.data && response.data.task) {
                setTask(response.data.task);
            }
        } catch (error) {
            console.error("Error updating checklist:", error);
        }
    };

    const handleCheckboxChange = (index) => {
        if (!task) return;
        const newChecklist = [...task.todoChecklist];
        newChecklist[index].completed = !newChecklist[index].completed;
        updateTodoChecklist(newChecklist);
    };

    const handleLinkClick = (link) => {
        window.open(link, "_blank");
    };

    const getFileIcon = (type) => {
        switch (type) {
            case "image": return <LuImage className="text-xl text-purple-600" />;
            case "video": return <LuVideo className="text-xl text-blue-600" />;
            case "pdf": return <LuFile className="text-xl text-red-600" />;
            case "doc":
            case "ppt":
            case "xls":
                return <LuFile className="text-xl text-blue-500" />;
            default: return <LuLink className="text-xl text-slate-600" />;
        }
    };

    useEffect(() => {
        if (id) {
            getTaskDetailsByID();
        }
        return () => { };
    }, [id]);


    return (
        <DashboardLayout activeMenu='My Tasks'>
            <div className="mt-5 mx-auto max-w-6xl">

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-gray-500">Loading Task Details...</p>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-red-500">{error}</p>
                    </div>
                ) : task && (
                    <div className="space-y-6">
                        {/* Header Section */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-semibold text-gray-800">{task.title || "Untitled Task"}</h2>
                                    <p className="text-sm text-gray-500 mt-2">{task.description || "No description provided."}</p>
                                </div>
                                <div className={`text-xs font-semibold text-center ${getStatusTagColor(task?.status)} px-5 w-35 py-1 rounded-full`}>
                                    {task?.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                                <div className="text-center">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Progress</label>
                                    <p className="text-sm font-semibold text-gray-800 mt-1 ">{task.progress}%</p>
                                </div>
                                <div className="text-center">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Due Date</label>
                                    <p className="text-sm font-semibold text-gray-800 mt-1">{task.dueDate ? moment(task.dueDate).format("Do MMM YYYY") : "N/A"}</p>
                                </div>
                                <div className="text-center">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</label>
                                    <p className="text-sm font-semibold text-gray-800 mt-1">{task.priority}</p>
                                </div>
                                <div className="text-center">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned To</label>
                                    <div className="mt-1 flex justify-center md:justify-start md:pl-8">

                                        <AvatarGroup
                                            avatars={task?.assignedTo?.map((item) => getAvatarUrl(item?.profileImageUrl, item?.name)) || []}
                                            maxAvatars={5}
                                            size="sm"
                                        />

                                    </div>
                                </div>
                            </div>
                        </div>


                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Todo Checklist */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                                <h3 className="text-lg font-medium text-gray-800 mb-4">Checklist</h3>

                                {task.todoChecklist && task.todoChecklist.length > 0 ? (
                                    <div className="space-y-3">
                                        {task.todoChecklist.map((todo, index) => (
                                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                                <input
                                                    type="checkbox"
                                                    checked={todo.completed}
                                                    onChange={() => handleCheckboxChange(index)}
                                                    className="w-5 h-5 mt-0.5 rounded text-primary focus:ring-primary/25 border-gray-300 cursor-pointer accent-primary"
                                                />
                                                <div className={`flex-1 text-sm prose prose-sm max-w-none leading-normal prose-p:my-0 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 w-full whitespace-normal ${todo.completed ? "line-through text-gray-400" : "text-gray-700"}`}>
                                                    <ReactMarkdown>
                                                        {todo.text || ""}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No Checklist items.</p>
                                )}
                            </div>

                            {/* Attachments */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                                <h3 className="text-lg font-medium text-gray-800 mb-4">Attachments</h3>

                                {task.attachments && task.attachments.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {task.attachments.map((item, index) => (
                                            <div key={index}
                                                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary/50 hover:bg-blue-50/50 cursor-pointer transition-all"
                                                onClick={() => handleLinkClick(item.fileUrl || item)}
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                                    {getFileIcon(item.fileType)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-700 truncate">{item.originalName || item}</p>
                                                    <p className="text-xs text-blue-600 truncate underline">View</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No attachments.</p>
                                )}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </DashboardLayout >
    );
}

export default ViewTaskDetails;



const InfoBox = ({ label, value }) => {
    return <>
        <label className="text-xs font-medium text-slate-500">{label}</label>

        <p className="text-[12px] md:text-[13px] font-medium text-gray-700 mt-0.5">{value}</p>
    </>


};