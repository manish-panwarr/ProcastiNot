import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { LuFileSpreadsheet, LuSearch } from 'react-icons/lu';
import UserCard from '../../components/Cards/UserCard';
import SelectDropdown from '../../components/inputs/SelectDropdown';
import toast from 'react-hot-toast';

const ManageUsers = () => {
  const navigate = useNavigate();

  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");

  const getAllUsers = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      if (response.data?.length > 0) {
        const members = response.data.filter(user => user.role === 'member');
        setAllUsers(members);
      }
    } catch (error) {
      console.log("Error fetching users:", error);
    }
  };

  // download task report
  const handleDownloadReport = async () => {
    try {
      console.log("Downloading report...");
      const response = await axiosInstance.get(API_PATHS.REPORTS.EXPORT_USERS, {
        responseType: 'blob',
        timeout: 30000,
      });

      if (response.status === 200) {
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute("download", "users_report.xlsx");
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        toast.error("Something went wrong while downloading the report.");
      }
    } catch (error) {
      console.log("Error downloading report:", error);
      toast.error("Failed to download report: " + (error.message || "Unknown error"));
    }
  };

  useEffect(() => {
    getAllUsers();

    return () => { };
  }, []);

  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = (user.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (user.department?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesDept = filterDepartment ? user.department === filterDepartment : true;
    return matchesSearch && matchesDept;
  });

  return (
    <DashboardLayout activeMenu="Team Members">
      <div className='mt-5 mb-10 ml-3'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <h2 className='text-xl md:text-xl ml-3 font-medium'>Team Members</h2>

          <div className='flex flex-col md:flex-row gap-3 pt-2 md:pt-0'>
            <div className="flex items-center gap-2 border-b border-gray-300 px-2 py-1 w-full md:w-64">
              <LuSearch className="text-gray-500 text-lg" />
              <input
                type="text"
                placeholder="Search user..."
                className="bg-transparent border-none outline-none focus:outline-none text-sm w-full placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="w-full md:w-48">
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

            <button className='flex md:flex download-btn' onClick={handleDownloadReport}>
              <LuFileSpreadsheet className='text-lg' />Download Report
            </button>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
          {filteredUsers?.length > 0 ? (
            filteredUsers.map((user) => (
              <div key={user._id} onClick={() => navigate(`/admin/users/${user._id}`)}>
                <UserCard userInfo={user} />
              </div>
            ))
          ) : (
            <p className="text-gray-500 col-span-3 text-center mt-10">No users found.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ManageUsers