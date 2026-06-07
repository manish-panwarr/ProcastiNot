import React, { lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Lazy loaded page components
const Login = lazy(() => import('./pages/Auth/Login'));
const SignUp = lazy(() => import('./pages/Auth/SignUp'));

const Dashboard = lazy(() => import('./pages/Admin/Dashboard'));
const ManageTasks = lazy(() => import('./pages/Admin/ManageTasks'));
const ManageUsers = lazy(() => import('./pages/Admin/ManageUsers'));
const UserDetails = lazy(() => import('./pages/Admin/UserDetails'));
const ManageAdmins = lazy(() => import('./pages/Admin/ManageAdmins'));
const AdminDetails = lazy(() => import('./pages/Admin/AdminDetails'));
const CreateTask = lazy(() => import('./pages/Admin/CreateTask'));
const ManagerDashboard = lazy(() => import('./pages/Admin/ManagerDashboard'));

const UserDashboard = lazy(() => import('./pages/User/UserDashboard'));
const MyTasks = lazy(() => import('./pages/User/MyTasks'));
const UserProfile = lazy(() => import('./pages/User/UserProfile'));
const ViewTaskDetails = lazy(() => import('./pages/User/ViewTaskDetails'));
const ChatPage = lazy(() => import('./pages/Chat/ChatPage'));

import PrivateRoute from './routes/PrivateRoute';
import { Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { UserContext } from './context/userContext';
import { Toaster } from 'react-hot-toast';
import LoadingSpinner from './components/LoadingSpinner';

const App = () => {
  return (
    <>

      <div>
        <Router>
          <Suspense fallback={<LoadingSpinner />}>
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
          </Suspense>
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

