import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";

//@desc : User authentication hook
export const useUserAuth = () => {
    const { user, loading, clearUser } = useContext(UserContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (loading) return;
        if (user) return;

        if (!user) {
            navigate('/login');
        }
    }, [user, loading, clearUser, navigate]);
};