import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from './pages/Auth/Login';
import SignUp from './pages/Auth/SignUp';

import Dashboard from './pages/Admin/Dashboard';
import ManageTasks from './pages/Admin/ManageTasks';
import ManageUsers from './pages/Admin/ManageUsers';
import UserDetails from './pages/Admin/UserDetails';
import ManageAdmins from './pages/Admin/ManageAdmins';
import AdminDetails from './pages/Admin/AdminDetails';
import CreateTask from './pages/Admin/CreateTask';
import ManagerDashboard from './pages/Admin/ManagerDashboard';

import UserDashboard from './pages/User/UserDashboard';
import MyTasks from './pages/User/MyTasks';
import UserProfile from './pages/User/UserProfile';
import ViewTaskDetails from './pages/User/ViewTaskDetails';
import ChatPage from './pages/Chat/ChatPage';


import PrivateRoute from './routes/PrivateRoute';
import { Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { UserContext } from './context/userContext';
import { Toaster } from 'react-hot-toast';

const App = () => {
  return (
    <>

      <div>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Manager Routes */}
            <Route element={<PrivateRoute allowedRoles={["manager"]} />}>
              <Route path="/manager/dashboard" element={<ManagerDashboard />} />
            </Route>

            {/*Admin Routes */}
            <Route element={<PrivateRoute allowedRoles={["admin", "manager"]} />}>
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/tasks" element={<ManageTasks />} />
              <Route path="/admin/create-task" element={<CreateTask />} />
              <Route path="/admin/users" element={<ManageUsers />} />
              <Route path="/admin/users/:id" element={<UserDetails />} />
              <Route path="/admin/admins" element={<ManageAdmins />} />
              <Route path="/admin/admins/:id" element={<AdminDetails />} />
            </Route>

            {/*User Routes */}
            <Route element={<PrivateRoute allowedRoles={['user', 'member', 'admin', 'manager']} />}>
              <Route path="/user/dashboard" element={<UserDashboard />} />
              <Route path="/user/tasks" element={<MyTasks />} />
              <Route path="/user/profile" element={<UserProfile />} />
              <Route path="/user/task-details/:id" element={<ViewTaskDetails />} />
              <Route path="/chat" element={<ChatPage />} />
            </Route>

            <Route path="/" element={<Root />} />
          </Routes>
        </Router>
      </div>


      <Toaster
        position="top-right"
        toastOptions={{
          className: "",
          style: {
            fontSize: "13px",
          },
        }}
      />
    </>
  );
}


export default App;


const Root = () => {
  const { user, loading } = useContext(UserContext);

  if (loading) return <Outlet />

  if (!user) {
    return <Navigate to="/login" />;
  };

  if (user.role === "manager") return <Navigate to="/manager/dashboard" />;
  if (user.role === "admin") return <Navigate to="/admin/dashboard" />;
  return <Navigate to="/user/dashboard" />;
}

