import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layouts/DashboardLayout'
import { useNavigate } from 'react-router-dom';
import { API_PATHS } from '../../utils/apiPaths';
import axiosInstance from '../../utils/axiosInstance';
import toast from 'react-hot-toast';
import { LuSearch } from "react-icons/lu";
import TaskCard from '../../components/Cards/TaskCard';
import SelectDropdown from '../../components/inputs/SelectDropdown';

const MyTasks = () => {

    const [allTasks, setAllTasks] = useState([]);
    const [filterStatus, setFilterStatus] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const navigate = useNavigate();

    const getAllTasks = async () => {
        try {
            const params = {
                status: filterStatus === "All Status" ? "" : filterStatus,
                search: searchQuery,
            };

            const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS, { params });

            if (response.data?.tasks) {
                setAllTasks(response.data.tasks);
            }
        } catch (error) {
            console.log("Error fetching tasks:", error);
        }
    };


    const handleClick = (taskData) => {
        navigate(`/user/task-details/${taskData._id}`);
    };


    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            getAllTasks();
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [filterStatus, searchQuery]);

    return <DashboardLayout activeMenu="My Tasks">
        <div className='my-5'>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className='text-xl md:text-2xl font-medium ml-3 text-gray-800'>My Tasks</h2>

                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex items-center gap-2 border-b border-gray-300 px-2 py-1 w-full md:w-64">
                        <LuSearch className="text-gray-500 text-lg" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="w-full md:w-48">
                        <SelectDropdown
                            options={[
                                { label: "All Status", value: "" },
                                { label: "Pending", value: "Pending" },
                                { label: "In Progress", value: "In Progress" },
                                { label: "Completed", value: "Completed" },
                            ]}
                            value={filterStatus}
                            onChange={(value) => setFilterStatus(value)}
                            placeholder="Filter by Status"
                        />
                    </div>
                </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5 '>
                {allTasks?.length > 0 ? (
                    allTasks.map((item) => (
                        <TaskCard
                            key={item._id}
                            title={item.title}
                            description={item.description}
                            status={item.status}
                            priority={item.priority}
                            progress={item.progress}
                            createdAt={item.createdAt}
                            dueDate={item.dueDate}
                            assignedTo={item.assignedTo}
                            attachmentCount={item.attachments?.length || 0}
                            completedTodoCount={item.completedTodoCount || 0}
                            todoChecklist={item.todoChecklist || []}
                            onClick={() => { handleClick(item) }}
                        />
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
                        <p className="text-lg">No tasks found.</p>
                        <p className="text-sm">Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>
        </div>
    </DashboardLayout>


}

export default MyTasks;