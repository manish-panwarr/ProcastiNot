import React, { useEffect, useState, useContext } from "react";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/userContext";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import InfoCard from "../../components/Cards/InfoCard";
import CustomPieChart from "../../components/Charts/CustomPieChart";
import CustomBarChart from "../../components/Charts/CustomBarChart";
import { addThousandsSeparator, getInitials, getAvatarUrl, getGreeting } from "../../utils/helper";

const PIE_COLORS = ["#8D51FF", "#00B8DB", "#7BCE00"];

const ManagerDashboard = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [userPerformance, setUserPerformance] = useState([]);
    const [loading, setLoading] = useState(true);

    const [pieChartData, setPieChartData] = useState([]);
    const [barChartData, setBarChartData] = useState([]);

    const getDashboardStats = async () => {
        try {
            const response = await axiosInstance.get(API_PATHS.USERS.GET_MANAGER_DASHBOARD_STATS);
            if (response.data) {
                setStats(response.data.counts);
                setUserPerformance(response.data.userPerformance);
                prepareCharts(response.data);
            }
        } catch (error) {
            console.error("Manager Dashboard Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const prepareCharts = (data) => {
        const { counts, userPerformance } = data;

        // Pie Chart: Task Status
        const pieData = [
            { status: "Pending", count: counts.pendingTasks || 0 },
            { status: "In Progress", count: counts.inProgressTasks || 0 },
            { status: "Completed", count: counts.completedTasks || 0 },
        ];
        setPieChartData(pieData);

        // Bar Chart: Top 5 Users by Tasks Completed
        const sortedUsers = [...userPerformance].sort((a, b) => b.completedAssigned - a.completedAssigned).slice(0, 5);
        const barData = sortedUsers.map(u => ({
            priority: u.name,
            count: u.completedAssigned
        }));
        setBarChartData(barData);
    };

    useEffect(() => {
        getDashboardStats();
    }, []);

    const handleProfileClick = (userId, role) => {
        if (role === 'admin' || role === 'manager') {
            navigate(`/admin/admins/${userId}`);
        } else {
            navigate(`/admin/users/${userId}`);
        }
    };

    return (
        <DashboardLayout activeMenu="Dashboard">
            <div className="bg-white rounded-2xl p-6 md:p-8 mb-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-md">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
                        {getGreeting()}, <span className="text-primary">{user?.name}</span> 👋
                    </h2>
                    <p className="text-sm md:text-base text-gray-500 font-medium flex items-center gap-2 mt-1">
                        <span>{moment().format("dddd, MMMM Do YYYY")}</span>
                        <span className="text-[10px] md:text-xs font-semibold text-white bg-purple-600 px-2.5 py-0.5 rounded-full ml-2">Manager</span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 mt-6">
                <InfoCard label="Total Users" value={stats?.totalUsers || 0} color="bg-blue-500" />
                <InfoCard label="Total Admins" value={stats?.totalAdmins || 0} color="bg-purple-500" />
                <InfoCard label="Total Tasks" value={stats?.totalTasks || 0} color="bg-indigo-500" />
                <InfoCard label="Completion Rate" value={`${stats?.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%`} color="bg-emerald-500" />
            </div>

            <div className="grid md:grid-cols-2 gap-6 my-6">
                <div className="card">
                    <h5 className="font-medium mb-3">Overall Task Status</h5>
                    <CustomPieChart data={pieChartData} colors={PIE_COLORS} />
                </div>
                <div className="card">
                    <h5 className="font-medium mb-3">Top Performers (Completed Tasks)</h5>
                    <CustomBarChart data={barChartData} />
                </div>
            </div>

            <div className="card my-6">
                <h5 className="text-lg mb-4">User Performance Table</h5>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                        <thead>
                            <tr className="text-left border-b border-gray-200 text-gray-500 text-sm">
                                <th className="py-3 px-4 font-medium">User</th>
                                <th className="py-3 px-4 font-medium">Role</th>
                                <th className="py-3 px-4 font-medium">Assigned</th>
                                <th className="py-3 px-4 font-medium">Completed</th>
                                <th className="py-3 px-4 font-medium">Created</th>
                                <th className="py-3 px-4 font-medium">Rate</th>
                                <th className="py-3 px-4 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userPerformance.map((u) => (
                                <tr key={u._id} className="border-b last:border-b-0 border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                                {u.profileImageUrl ? (
                                                    <img src={u.profileImageUrl} alt={u.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-sm font-medium text-gray-500">{getInitials(u.name)}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{u.name}</p>
                                                <p className="text-xs text-gray-500">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium 
                                            ${u.role === 'manager' ? 'bg-purple-100 text-purple-700' :
                                                u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {u.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-700">{u.assignedCount}</td>
                                    <td className="py-3 px-4 text-sm text-gray-700">{u.completedAssigned}</td>
                                    <td className="py-3 px-4 text-sm text-gray-700">{u.createdCount}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${u.completionRate}%` }}></div>
                                            </div>
                                            <span className="text-xs text-gray-500">{u.completionRate}%</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <button
                                            onClick={() => handleProfileClick(u._id, u.role)}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            View Profile
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout >
    );
};

export default ManagerDashboard;
