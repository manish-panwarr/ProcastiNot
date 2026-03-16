import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layouts/DashboardLayout'
import { useNavigate, useLocation } from 'react-router-dom';
import { API_PATHS } from '../../utils/apiPaths';
import axiosInstance from '../../utils/axiosInstance';
import toast from 'react-hot-toast';
import { LuFileSpreadsheet, LuSearch } from "react-icons/lu";
import TaskStatusTabs from '../../components/TaskStatusTabs';
import TaskCard from '../../components/Cards/TaskCard';
import SelectDropdown from '../../components/inputs/SelectDropdown';

import { useContext } from 'react';
import { UserContext } from '../../context/userContext';

const ManageTasks = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(UserContext);

  const initialFilterOwner = location.state?.filterOwner || "All";

  const [allTasks, setAllTasks] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterOwner, setFilterOwner] = useState(initialFilterOwner);

  const getAllTasks = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS, {
        params: {
          status: filterStatus === "All" ? "" : filterStatus,
          department: filterDepartment,
          search: searchQuery,
          createdByMe: filterOwner === "created_by_me" ? "true" : "",
          assignedToMe: filterOwner === "assigned_to_me" ? "true" : "",
        },
      });

      if (response.data?.tasks) {
        setAllTasks(response.data.tasks);
      }

      // Map statusSummary data with fixed labels and order
      const statusSummary = response.data?.statusSummary || {};

      const statusArray = [
        { label: "All", count: statusSummary.all || 0 },
        { label: "Pending", count: statusSummary.pendingTasks || 0 },
        { label: "In Progress", count: statusSummary.inProgressTasks || 0 },
        { label: "Completed", count: statusSummary.completedTasks || 0 },
      ];

      setTabs(statusArray);

    } catch (error) {
      console.log("Error fetching tasks:", error);
    }
  };

  const handleClick = (taskData) => {
    let creatorId = taskData.createdBy;
    if (creatorId && typeof creatorId === 'object' && creatorId._id) {
      creatorId = creatorId._id;
    }
    const creatorIdStr = creatorId ? creatorId.toString() : '';

    const isManager = user?.role === 'manager';
    const isAdmin = user?.role === 'admin';
    const isCreator = creatorIdStr === user?._id?.toString();

    const isAssigned = taskData.assignedTo?.some(u => {
      const uid = u?._id ? u._id.toString() : u?.toString();
      return uid === user?._id?.toString();
    });

    // Manager or Creator → Edit/Update page
    if (isManager || isCreator) {
      navigate(`/admin/create-task`, { state: { taskId: taskData._id } });
      return;
    }

    // Admin assigned to task → View details
    if (isAdmin && isAssigned) {
      navigate(`/user/task-details/${taskData._id}`);
      return;
    }


    // Regular member assigned to task → View details
    if (isAssigned) {
      navigate(`/user/task-details/${taskData._id}`);
      return;
    }

    toast.error('Access denied. You can only view tasks you created or are assigned to.');
  };


  // download task report
  const handleDownloadReport = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.REPORTS.EXPORT_TASKS, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute("download", "tasks_report.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.log("Error downloading report:", error);
      toast.error("Failed to download report. Please try again later.");
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      getAllTasks();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [filterStatus, filterDepartment, searchQuery, filterOwner]);

  return <DashboardLayout activeMenu="Manage Tasks">
    <div className='my-5 md:ml-3'>
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
          <div className='flex items-center justify-between gap-3'>
            <h2 className='text-xl md:text-xl font-medium'>Manage Tasks</h2>
          </div>

          <div className='flex flex-col md:flex-row gap-3 pt-2 md:pt-0'>
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

            <div className="w-full md:w-48 ">
              <SelectDropdown
                options={[
                  { label: "All Tasks", value: "All" },
                  { label: "Assigned to Me", value: "assigned_to_me" },
                  { label: "Created by Me", value: "created_by_me" },
                ]}
                value={filterOwner}
                onChange={(value) => setFilterOwner(value)}
                placeholder="Owner Filter"
              />
            </div>

            <div className="w-full md:w-48 ">
              <SelectDropdown
                options={[
                  { label: "All Departments", value: "" },
                  { label: "HR", value: "HR" },
                  { label: "IT", value: "IT" },
                  { label: "Security", value: "Security" },
                  { label: "Management", value: "Management" },
                  { label: "Other", value: "Other" },
                ]}
                value={filterDepartment}
                onChange={(value) => setFilterDepartment(value)}
                placeholder="Filter by Dept"

              />
            </div>

            <button className='flex items-center justify-center gap-2 download-btn whitespace-nowrap' onClick={handleDownloadReport}>
              <LuFileSpreadsheet className='text-xl' /> <span className="hidden md:inline">Download Report</span><span className="md:hidden">Export</span>
            </button>

          </div>
        </div>

        {tabs?.[0]?.count >= 0 && (
          <div className='flex flex-col md:flex-row md:items-center justify-between mt-2 gap-4'>
            <TaskStatusTabs
              tabs={tabs}
              activeTab={filterStatus}
              setActiveTab={setFilterStatus}
            />
          </div>
        )}
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-5 mt-5 ml-2'>
        {allTasks?.length > 0 ? (
          allTasks.map((item, index) => (
            <TaskCard
              key={item._id}
              title={item.title}
              description={item.description}
              status={item.status}
              progress={item.progress}
              createdAt={item.createdAt}
              dueDate={item.dueDate}
              assignedTo={item.assignedTo}
              assignedToUser={item.assignedTo}
              attachmentCount={item.attachments?.length || 0}
              completedTodoCount={item.completedTodoCount || 0}
              todoChecklist={item.todoChecklist || []}
              priority={item.priority}
              onClick={() => { handleClick(item) }}
            />
          ))
        ) : (
          <div className="col-span-3 text-center py-10 text-gray-500">
            No tasks found matching your filters.
          </div>
        )}
      </div>
    </div>
  </DashboardLayout>


}

export default ManageTasks