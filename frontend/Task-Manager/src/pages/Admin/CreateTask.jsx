import React, { useEffect, useState, useContext } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { PRIORITY_DATA } from '../../utils/data';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import toast from "react-hot-toast";
import { useLocation, useNavigate } from 'react-router-dom';
import moment from "moment";
import { LuTrash2 } from "react-icons/lu";
import SelectDropdown from '../../components/inputs/SelectDropdown';
import SelectUsers from '../../components/inputs/SelectUsers';
import TodoListInput from '../../components/inputs/TodoListInput';
import AddAttachmentsInput from '../../components/inputs/AddAttachmentsInput';
import Modal from '../../components/Modal';
import DeleteAlert from '../../components/layouts/DeleteAlert';
import { UserContext } from '../../context/userContext';


const CreateTask = () => {

  const location = useLocation();
  const { taskId } = location.state || {};
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    priority: "",
    dueDate: "",
    assignedTo: [],
    todoChecklist: [],
    attachments: [],
  });
  const [files, setFiles] = useState([]);


  const [currentTask, setCurrentTask] = useState(null);
  const [error, setError] = useState("");

  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleValueChange = (key, value) => {
    setTaskData((prevData) => ({ ...prevData, [key]: value }));
  };

  const clearData = () => {
    //reset form
    setTaskData({
      title: "",
      description: "",
      priority: "",
      dueDate: "",
      assignedTo: [],
      todoChecklist: [],
      attachments: [],
    });
    setFiles([]);
    setError("");
    setCurrentTask(null);
  };

  // Create Task
  const createTask = async (formData) => {
    setLoading(true);

    try {
      const response = await axiosInstance.post(API_PATHS.TASKS.CREATE_TASK, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Task Created Successfully.");

      clearData();
    } catch (error) {
      console.log("Error creating task:", error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Update Task
  const updateTask = async (formData) => {
    setLoading(true);

    try {
      const response = await axiosInstance.put(API_PATHS.TASKS.UPDATE_TASK(taskId), formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Task Updated Successfully.");

      clearData();
    } catch (error) {
      console.log("Error updating task:", error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    // Input validation
    if (!taskData.title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!taskData.description.trim()) {
      setError("Description is required.");
      return;
    }

    if (!taskData.dueDate) {
      setError("Due Date is required.");
      return;
    }

    if (taskData.assignedTo?.length === 0) {
      setError("Task not assigned to any member !");
      return;
    }

    if (!taskData.priority) {
      setError("Priority is required.");
      return;
    }

    if (taskData.todoChecklist?.length === 0) {
      setError("Add atleast one todo item.");
      return;
    }

    // Prepare FormData
    const formData = new FormData();
    formData.append("title", taskData.title);
    formData.append("description", taskData.description);
    formData.append("priority", taskData.priority);
    formData.append("dueDate", new Date(taskData.dueDate).toISOString());
    formData.append("assignedTo", JSON.stringify(taskData.assignedTo)); // Array of user IDs

    // Map todoChecklist strings to {text, completed} objects
    const todolist = taskData.todoChecklist?.map((item) => ({
      text: item,
      completed: false,
    }));

    formData.append("todoChecklist", JSON.stringify(todolist));
    formData.append("attachments", JSON.stringify(taskData.attachments)); // Existing/Link Attachments

    // Append new files
    if (files.length > 0) {
      files.forEach((file) => {
        formData.append("attachments", file);
      });
    }

    if (taskId) {
      updateTask(formData);
      return;
    }
    createTask(formData);

  };

  // Get Task info by ID
  const getTaskDetailsByID = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_TASK_BY_ID(taskId));

      if (response.data) {
        const taskInfo = response.data;

        // Permission Check: Only Manager or Creator can View/Edit in this page
        // Assigned users should use 'Task Details' page, not this 'Create/Edit Task' page.

        const isManager = user?.role === "manager";
        const isCreator = taskInfo.createdBy?.toString() === user?._id?.toString();

        if (!isManager && !isCreator) {
          toast.error("Access denied. Only the Task Creator or Manager can edit this task.");
          navigate('/admin/tasks');
          return;
        }

        setCurrentTask(taskInfo);

        setTaskData((prevState) => ({
          title: taskInfo.title,
          description: taskInfo.description,
          priority: taskInfo.priority,
          dueDate: taskInfo.dueDate ? moment(taskInfo.dueDate).format("YYYY-MM-DD") : "",
          assignedTo: taskInfo?.assignedTo?.map((item) => typeof item === 'object' ? item?._id : item) || [],
          todoChecklist: taskInfo?.todoChecklist?.map((item) => typeof item === 'object' ? item?.text : item) || [],
          attachments: taskInfo?.attachments || [],
        }));
      }
    } catch (error) {
      console.log("Error fetching task details:", error);
      navigate("/admin/tasks");
    }
  };

  // Delete Task
  const deleteTask = async () => {
    try {
      await axiosInstance.delete(API_PATHS.TASKS.DELETE_TASK(taskId));
      setOpenDeleteAlert(false);
      toast.success("Task Deleted Successfully.");
      navigate("/admin/tasks");
    } catch (error) {
      console.log("Error deleting task:", error);
    }
  };


  useEffect(() => {
    if (taskId) {
      getTaskDetailsByID(taskId);
    }
    return () => { };
  }, [taskId]);


  return (
    <DashboardLayout activeMenu="Create Task">
      <div className='mt-5'>
        <div className='bg-white rounded-2xl shadow-md border border-gray-200/50 p-6 mx-auto w-full max-w-5xl mt-8'>

          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-xl font-medium text-slate-800'>
              {taskId ? "Update Task" : "Create Task"}
            </h2>
            {taskId && (
              <button className='flex items-center gap-1.5 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md px-3 py-1.5 border border-rose-200 hover:border-rose-300 transition-colors duration-300'
                onClick={() => setOpenDeleteAlert(true)}
              >
                <LuTrash2 className='text-lg' /> Delete Task
              </button>
            )}
          </div>

          <div className='space-y-6'>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-1'>Task Title</label>
              <input placeholder='e.g. Design Homepage'
                className='form-input'
                value={taskData.title}
                onChange={({ target }) => handleValueChange("title", target.value)} />
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-700 mb-1'>Description</label>
              <textarea placeholder='Add task details...'
                className='form-input resize-y min-h-[100px] max-h-[200px]'
                rows={4}
                value={taskData.description}
                onChange={({ target }) => handleValueChange("description", target.value)} />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-1'>Priority</label>

                <SelectDropdown
                  options={PRIORITY_DATA}
                  value={taskData.priority}
                  onChange={(value) => handleValueChange("priority", value)}
                  placeholder="Select Priority"
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700 mb-1'>Due Date</label>

                <input type='date' placeholder='Select Due Date'
                  className='form-input '
                  value={taskData.dueDate}
                  onChange={({ target }) => handleValueChange("dueDate", target.value)} />
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700 mb-1'>Assign To</label>
                <SelectUsers
                  selectedUsers={taskData.assignedTo}
                  setSelectedUsers={(value) => {
                    handleValueChange("assignedTo", value);
                  }}
                  placeholder="Select User"
                  ignoreRole="manager"
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='mt-3'>
                <label className='text-sm font-medium text-slate-700 mb-2 block'>TODO Checklist</label>

                <TodoListInput
                  todoList={taskData.todoChecklist}
                  setTodoList={(value) => handleValueChange("todoChecklist", value)}
                />
              </div>

              <div className='mt-3'>
                <label className='text-sm font-medium text-slate-700 mb-2 block'>Add Attachments</label>

                <AddAttachmentsInput
                  attachments={taskData?.attachments}
                  setAttachments={(value) => handleValueChange("attachments", value)}
                  files={files}
                  setFiles={setFiles}
                />
              </div>
            </div>



            {error && (<p className='text-xs font-medium text-red-500 mt-5'>{error}</p>)}
            <div className='flex justify-end mt-7'>
              <button className='add-btn'
                onClick={handleSubmit}
                disabled={loading}>
                {taskId ? "UPDATE TASK" : "CREATE TASK"}
              </button>
            </div>
          </div>
        </div>
      </div>





      <Modal
        isOpen={openDeleteAlert}
        onClose={() => setOpenDeleteAlert(false)}
        title="Delete Task"
      >
        <DeleteAlert
          content="Are you sure you want to delete this task?"
          onDelete={deleteTask}
        />
      </Modal>
    </DashboardLayout>
  )
}

export default CreateTask