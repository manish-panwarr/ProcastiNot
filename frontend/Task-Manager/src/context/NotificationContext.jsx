import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useSocket } from './SocketContext';
import { UserContext } from './userContext';
import toast from 'react-hot-toast';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { socket } = useSocket();
    const { user } = useContext(UserContext);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/api/notifications');
            setNotifications(res.data);
            const unread = res.data.filter((n) => !n.isRead).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    }, []);

    // Fetch on login / logout
    useEffect(() => {
        if (user) {
            fetchNotifications();
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [user, fetchNotifications]);

    // Re-fetch when socket reconnects (catches missed notifications during disconnect gap)
    useEffect(() => {
        if (!socket || !user) return;

        const onConnect = () => {
            fetchNotifications();
        };

        socket.on('connect', onConnect);
        socket.on('reconnect', onConnect);

        return () => {
            socket.off('connect', onConnect);
            socket.off('reconnect', onConnect);
        };
    }, [socket, user, fetchNotifications]);

    // Real-time notification listener
    useEffect(() => {
        if (!socket || !user) return;

        const handleNewNotification = (notification) => {
            setNotifications((prev) => {
                // Prevent duplicate notifications
                if (prev.some(n => n._id === notification._id)) return prev;
                return [notification, ...prev];
            });
            setUnreadCount((prev) => prev + 1);

            toast.success(notification.message, {
                position: 'top-right',
                duration: 5000,
                style: {
                    background: '#fff',
                    color: '#333',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    borderRadius: '8px',
                    padding: '16px',
                },
            });
        };

        const handleNotificationsDeleted = ({ ids }) => {
            if (ids && ids.length > 0) {
                const idSet = new Set(ids.map(id => id.toString()));
                setNotifications((prev) => prev.filter((n) => !idSet.has(n._id.toString())));
            }
        };

        socket.on('new_notification', handleNewNotification);
        socket.on('notifications_deleted', handleNotificationsDeleted);

        return () => {
            socket.off('new_notification', handleNewNotification);
            socket.off('notifications_deleted', handleNotificationsDeleted);
        };
    }, [socket, user]);

    const markAsRead = async (id) => {
        try {
            await axiosInstance.put(`/api/notifications/${id}/read`);
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axiosInstance.put('/api/notifications/read-all');
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, isRead: true }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                markAsRead,
                markAllAsRead,
                fetchNotifications,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};
