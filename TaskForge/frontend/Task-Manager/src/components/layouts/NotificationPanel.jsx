import React, { useContext, useState, useRef, useEffect } from 'react';
import { NotificationContext } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { BsBell, BsBellFill } from 'react-icons/bs';
import moment from 'moment';

const NotificationPanel = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useContext(NotificationContext);
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef();
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            markAsRead(notification._id);
        }
        setIsOpen(false);

        if (notification.type === 'TASK_ASSIGNED') {
            navigate('/user/tasks');
        } else if (notification.type === 'TASK_DEADLINE' || notification.type === 'TASK_UPDATED') {
            if (notification.task && notification.task._id) {
                navigate(`/user/task-details/${notification.task._id}`);
            } else {
                navigate('/user/tasks');
            }
        } else if (notification.type === 'CHAT_MESSAGE') {
            navigate('/chat');
        }
    };

    return (
        <div className="layout relative" ref={panelRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex items-center justify-center p-2 rounded-full hover:scale-110 transition-colors"
                title="Notifications"
            >
                {unreadCount > 0 ? (
                    <BsBellFill className="w-[20px] h-[20px] text-[#1368EC]" />
                ) : (
                    <BsBell className="w-[20px] h-[20px] text-slate-500" />
                )}

                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex items-center justify-center min-w-[16px] h-[16px] text-[10px] font-bold bg-red-500 text-white rounded-full px-1 border border-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-16 sm:top-auto sm:mt-2 w-auto sm:w-96 bg-white border border-gray-200 shadow-xl rounded-xl z-50 overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[85vh]">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-semibold text-gray-800">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-primary font-medium hover:text-blue-700 transition"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500 text-sm flex flex-col items-center">
                                <BsBell className="w-8 h-8 text-gray-300 mb-2" />
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification._id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors flex gap-3 ${!notification.isRead ? 'bg-[#f0f7ff]' : ''}`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                {notification.message}
                                            </p>
                                            <span className="text-xs text-gray-500 mt-1 block">
                                                {moment(notification.createdAt).fromNow()}
                                            </span>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationPanel;
