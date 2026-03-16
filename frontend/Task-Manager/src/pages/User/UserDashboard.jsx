import React, { useEffect, useState, useContext } from "react";
import moment from "moment";
import { LuArrowRight, LuSearch } from "react-icons/lu";
import { useNavigate } from "react-router-dom";

import { useUserAuth } from "../../hooks/useUserAuth";
import { UserContext } from "../../context/userContext";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

import InfoCard from "../../components/Cards/InfoCard";
import TaskListTable from "../../components/layouts/TaskListTable";
import CustomPieChart from "../../components/Charts/CustomPieChart";
import CustomBarChart from "../../components/Charts/CustomBarChart";
import CustomLineChart from "../../components/Charts/CustomLineChart";
import { addThousandsSeparator, getGreeting } from "../../utils/helper";
import TaskCard from "../../components/Cards/TaskCard";
import SelectDropdown from "../../components/inputs/SelectDropdown";

const PIE_COLORS = ["#8D51FF", "#00B8DB", "#7BCE00"];

const UserDashboard = () => {
    useUserAuth();
    const { user } = useContext(UserContext);
    const navigate = useNavigate();

    const [dashboardData, setDashboardData] = useState(null);
    const [pieChartData, setPieChartData] = useState([]);
    const [barChartData, setBarChartData] = useState([]);
    const [lineChartData, setLineChartData] = useState([]);
    const [loading, setLoading] = useState(false);

    // My Tasks State
    const [myTasks, setMyTasks] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

    const prepareChartData = (charts) => {
        if (!charts) {
            setPieChartData([]);
            setBarChartData([]);
            setLineChartData([]);
            return;
        }

        const {
            taskDistribution = {},
            taskPriorityLevels = {},
            last7Days = [],
        } = charts;

        // PIE CHART (Task Distribution)
        const pieData = [
            { status: "Pending", count: Number(taskDistribution.Pending) || 0 },
            { status: "In Progress", count: Number(taskDistribution.InProgress) || 0 },
            { status: "Completed", count: Number(taskDistribution.Completed) || 0 },
        ];

        setPieChartData(pieData);

        // BAR CHART (Priority Levels)
        const barData = [
            { priority: "High", count: Number(taskPriorityLevels.High) || 0 },
            { priority: "Medium", count: Number(taskPriorityLevels.Medium) || 0 },
            { priority: "Low", count: Number(taskPriorityLevels.Low) || 0 },
        ];

        setBarChartData(barData);
        setLineChartData(last7Days);
    };

    const getDashboardData = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get(
                API_PATHS.TASKS.GET_USER_DASHBOARD_DATA
            );

            if (response?.data) {
                setDashboardData(response.data);
                prepareChartData(response.data.charts);
            }
        } catch (error) {
            console.error("Dashboard API error:", error);
            setDashboardData(null);
            setPieChartData([]);
            setBarChartData([]);
            setLineChartData([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyTasks = async () => {
        try {
            const params = {
                search: searchQuery,
                status: filterStatus,
            };
            const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS, { params });
            if (response.data && response.data.tasks) {
                setMyTasks(response.data.tasks);
            }
        } catch (error) {
            console.log("Error fetching my tasks:", error);
        }
    };

    useEffect(() => {
        getDashboardData();
    }, []);

    const onSeeMore = () => {
        navigate("/user/tasks");
    };

    const handleRecentTaskClick = (task) => {
        navigate(`/user/task-details/${task._id}`);
    };

    return (
        <DashboardLayout activeMenu="Dashboard">
            {/* Headers */}
            <div className="bg-white rounded-2xl p-6 md:p-8 mb-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-md">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
                        {getGreeting()}, <span className="text-primary">{user?.name}</span> 👋
                    </h2>
                    <p className="text-sm md:text-base text-gray-500 font-medium">
                        {moment().format("dddd, MMMM Do YYYY")}
                    </p>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                <InfoCard
                    label="Total Tasks"
                    value={addThousandsSeparator(
                        dashboardData?.charts?.taskDistribution?.All || 0
                    )}
                    color="bg-primary"
                />
                <InfoCard
                    label="Pending Tasks"
                    value={addThousandsSeparator(
                        dashboardData?.charts?.taskDistribution?.Pending || 0
                    )}
                    color="bg-amber-500"
                />
                <InfoCard
                    label="In Progress Tasks"
                    value={addThousandsSeparator(
                        dashboardData?.charts?.taskDistribution?.InProgress || 0
                    )}
                    color="bg-cyan-500"
                />
                <InfoCard
                    label="Completed Tasks"
                    value={addThousandsSeparator(
                        dashboardData?.charts?.taskDistribution?.Completed || 0
                    )}
                />
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6 my-6">
                <div className="card">
                    <h5 className="font-medium mb-3">Task Distribution</h5>
                    <CustomPieChart
                        data={pieChartData}
                        colors={PIE_COLORS}
                    />
                </div>

                <div className="card">
                    <h5 className="font-medium mb-3">Task Priority Levels</h5>
                    <CustomBarChart data={barChartData} />
                </div>

                <div className="card md:col-span-2">
                    <h5 className="font-medium mb-3">Weekly Completed Tasks</h5>
                    <CustomLineChart data={lineChartData} />
                </div>
            </div>

            {/* Recent Tasks */}
            {
                dashboardData?.recentTasks && dashboardData.recentTasks.length > 0 && (
                    <div className="card my-6">
                        <div className="flex items-center justify-between mb-4">
                            <h5 className="text-lg">Recent Tasks</h5>
                            <button className="card-btn" onClick={() => navigate("/user/tasks")}>
                                See All <LuArrowRight className="text-base" />
                            </button>
                        </div>

                        <TaskListTable tableData={dashboardData?.recentTasks || []} />
                    </div>
                )
            }
        </DashboardLayout >
    );
};

export default UserDashboard;