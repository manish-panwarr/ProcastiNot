import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { LuSearch } from 'react-icons/lu';
import UserCard from '../../components/Cards/UserCard';
import SelectDropdown from '../../components/inputs/SelectDropdown';

const ManageAdmins = () => {
    const navigate = useNavigate();

    const [allAdmins, setAllAdmins] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterDepartment, setFilterDepartment] = useState("");

    const getAllAdmins = async () => {
        try {
            const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
            if (response.data?.length > 0) {
                const admins = response.data.filter(user => user.role?.toLowerCase() === 'admin');
                setAllAdmins(admins);
            }
        } catch (error) {
            console.log("Error fetching admins:", error);
        }
    };

    useEffect(() => {
        getAllAdmins();

        return () => { };
    }, []);

    const filteredAdmins = allAdmins.filter(admin => {
        const matchesSearch = (admin.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (admin.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (admin.department?.toLowerCase() || "").includes(searchQuery.toLowerCase());
        const matchesDept = filterDepartment ? admin.department === filterDepartment : true;
        return matchesSearch && matchesDept;
    });

    return (
        <DashboardLayout activeMenu="Admins">
            <div className='mt-5 mb-10 ml-3'>
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
            </div>
        </DashboardLayout>
    );
}

export default ManageAdmins;
