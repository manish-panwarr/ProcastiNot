import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { UserContext } from "../context/userContext";

const PrivateRoute = ({ allowedRoles }) => {
    const { user, loading } = useContext(UserContext);

    if (loading) return <div>Loading...</div>; // Or a spinner component

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard based on role, or unauthorized page
        if (user.role === 'admin' || user.role === 'manager') return <Navigate to="/admin/dashboard" replace />;
        return <Navigate to="/user/dashboard" replace />;
    }

    return <Outlet />;
};

export default PrivateRoute;