import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { LuSearch } from 'react-icons/lu';
import UserCard from '../../components/Cards/UserCard';
import SelectDropdown from '../../components/inputs/SelectDropdown';
import Pagination from '../../components/Pagination';

const ManageAdmins = () => {
    const navigate = useNavigate();

    const [allAdmins, setAllAdmins] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterDepartment, setFilterDepartment] = useState("");

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    const getAllAdmins = async () => {
        try {
            const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS, {
                params: {
                    paginate: "true",
                    role: "admin",
                    page: currentPage,
                    limit: 9,
                    search: searchQuery,
                    department: filterDepartment,
                }
            });
            if (response.data?.success) {
                setAllAdmins(response.data.users || []);
                setTotalPages(response.data.pagination?.totalPages || 1);
                setTotalResults(response.data.pagination?.total || 0);
            }
        } catch (error) {
            console.log("Error fetching admins:", error);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterDepartment]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            getAllAdmins();
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [currentPage, searchQuery, filterDepartment]);

    const filteredAdmins = allAdmins;

    return (
        <DashboardLayout activeMenu="Admins">
            <div className='mt-5 mb-10 ml-3 pb-28'>
                <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
                    <h2 className='text-xl md:text-xl ml-3 font-medium'>Admins</h2>

                    <div className='flex flex-col md:flex-row gap-3 pt-2 md:pt-0'>
                        <div className="flex items-center gap-2 border-b border-gray-300 px-2 py-1 w-full md:w-64">
                            <LuSearch className="text-gray-500 text-lg" />
                            <input
                                type="text"
                                placeholder="Search admin..."
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
                    </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
                    {filteredAdmins?.length > 0 ? (
                        filteredAdmins.map((admin) => (
                            <div key={admin._id} onClick={() => navigate(`/admin/admins/${admin._id}`)}>
                                <UserCard userInfo={admin} />
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 col-span-3 text-center mt-10">No admins found.</p>
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

export default ManageAdmins;
