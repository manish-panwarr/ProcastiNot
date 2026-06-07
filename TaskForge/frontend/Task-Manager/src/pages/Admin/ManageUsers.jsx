import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { LuFileSpreadsheet, LuSearch } from 'react-icons/lu';
import UserCard from '../../components/Cards/UserCard';
import SelectDropdown from '../../components/inputs/SelectDropdown';
import toast from 'react-hot-toast';
import Pagination from '../../components/Pagination';

const ManageUsers = () => {
  const navigate = useNavigate();

  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const getAllUsers = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS, {
        params: {
          paginate: "true",
          role: "member",
          page: currentPage,
          limit: 9,
          search: searchQuery,
          department: filterDepartment,
        }
      });
      if (response.data?.success) {
        setAllUsers(response.data.users || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalResults(response.data.pagination?.total || 0);
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
    setCurrentPage(1);
  }, [searchQuery, filterDepartment]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      getAllUsers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchQuery, filterDepartment]);

  const filteredUsers = allUsers;

  return (
    <DashboardLayout activeMenu="Team Members">
      <div className='mt-5 mb-10 ml-3 pb-28'>
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
                  { label: "Management", value: "Management" },
                  { label: "HR", value: "HR" },
                  { label: "IT", value: "IT" },
                  { label: "Technical", value: "Technical" },
                  { label: "UI/UX", value: "UI/UX" },
                  { label: "Marketing", value: "Marketing" },
                  { label: "Sales", value: "Sales" },
                  { label: "Security", value: "Security" },
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

        {totalResults > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={totalResults}
            limit={9}
            onPageChange={(page) => setCurrentPage(page)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default ManageUsers