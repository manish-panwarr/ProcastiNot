import React, { useEffect, useState, useContext } from "react";
import moment from "moment";
import { LuArrowRight } from "react-icons/lu";
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
import UserPerformanceCard from "../../components/Cards/UserPerformanceCard";
import { addThousandsSeparator, getInitials, getGreeting } from "../../utils/helper";

const PIE_COLORS = ["#8D51FF", "#00B8DB", "#7BCE00"];

const Dashboard = () => {
  useUserAuth();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [pieChartData, setPieChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);
  const [lineChartData, setLineChartData] = useState([]);
  const [deptChartData, setDeptChartData] = useState([]); // New
  const [workloadChartData, setWorkloadChartData] = useState([]); // New
  const [loading, setLoading] = useState(false);

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
      tasksByDepartment = {},
      activeWorkload = []
    } = charts;

    const pieData = [
      { status: "Pending", count: Number(taskDistribution.Pending) || 0 },
      { status: "In Progress", count: Number(taskDistribution.InProgress) || 0 },
      { status: "Completed", count: Number(taskDistribution.Completed) || 0 },
    ];
    setPieChartData(pieData);

    const barData = [
      { priority: "High", count: Number(taskPriorityLevels.High) || 0 },
      { priority: "Medium", count: Number(taskPriorityLevels.Medium) || 0 },
      { priority: "Low", count: Number(taskPriorityLevels.Low) || 0 },
    ];
    setBarChartData(barData);

    setBarChartData(barData);

    setLineChartData(last7Days);

    // Tasks by Department
    const deptData = Object.keys(tasksByDepartment).map(key => ({
      status: key,
      count: tasksByDepartment[key]
    }));
    setDeptChartData(deptData);

    // Active Workload
    const workloadData = activeWorkload.map(item => ({
      priority: getInitials(item.name),
      fullName: item.name,
      count: item.count
    }));
    setWorkloadChartData(workloadData);
  };

  const getDashboardData = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(
        API_PATHS.TASKS.GET_DASHBOARD_DATA
      );

      if (response?.data) {
        setDashboardData(response.data);
        prepareChartData(response.data.charts);
      }
    } catch (error) {
      console.error("Dashboard API error:", error);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDashboardData();
  }, []);

  const onSeeMore = () => {
    navigate("/admin/tasks");
  };

  return (
    <DashboardLayout activeMenu="Dashboard">
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 mt-6">
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
          color="bg-lime-500"
        />
      </div>

      <div className="flex justify-end mb-4">
        <button
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          onClick={() => navigate("/admin/tasks", { state: { filterOwner: "assigned_to_me" } })}
        >
          My Tasks <LuArrowRight />
        </button>
      </div>

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

        <div className="card">
          <h5 className="font-medium mb-3">Tasks by Department</h5>
          <CustomPieChart
            data={deptChartData}
            colors={PIE_COLORS}
          />
        </div>

        <div className="card">
          <h5 className="font-medium mb-3">Active Workload by User</h5>
          <CustomBarChart data={workloadChartData} />
        </div>

        <div className="md:col-span-2">
          <UserPerformanceCard data={dashboardData?.charts?.topPerformers || []} />
        </div>
      </div>

      <div className="card my-6">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-lg">Recent Tasks</h5>
          <button className="card-btn" onClick={onSeeMore}>
            See All <LuArrowRight className="text-base" />
          </button>
        </div>

        <TaskListTable tableData={dashboardData?.recentTasks || []} />
      </div>
    </DashboardLayout >
  );
};

export default Dashboard;