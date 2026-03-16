import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import io from "socket.io-client";
import { UserContext } from "./userContext";
import { BASE_URL } from "../utils/apiPaths";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

// Global Chat Notification Toast
const ChatNotifToast = ({ notif, onDismiss, onOpen }) => {
    useEffect(() => {
        const t = setTimeout(onDismiss, 5000);
        return () => clearTimeout(t);
    }, [onDismiss]);

    return ReactDOM.createPortal(
        <div
            onClick={onOpen}
            style={{
                position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999,
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'rgba(15,23,42,0.92)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '16px',
                padding: '12px 16px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(19,104,236,0.2)',
                cursor: 'pointer',
                animation: 'cnToastIn 0.32s cubic-bezier(.34,1.4,.64,1)',
                maxWidth: '320px',
                fontFamily: "'Poppins', sans-serif",
            }}
        >
            {/* Avatar */}
            <div style={{
                width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#1368EC,#7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '15px', fontWeight: '700', color: '#fff',
                boxShadow: '0 4px 12px rgba(19,104,236,0.4)',
                overflow: 'hidden',
            }}>
                {notif.avatar
                    ? <img src={notif.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (notif.senderName?.[0] || '?').toUpperCase()
                }
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {notif.senderName || 'Someone'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {notif.preview || 'Sent you a message'}
                </p>
            </div>

            {/* Chat icon */}
            <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'rgba(19,104,236,0.2)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                        stroke="#1368EC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>

            <button
                onClick={e => { e.stopPropagation(); onDismiss(); }}
                style={{
                    position: 'absolute', top: '8px', right: '10px',
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0,
                }}
            >✕</button>

            {/* Progress bar */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
                borderRadius: '0 0 16px 16px', background: 'rgba(19,104,236,0.5)',
                animation: 'cnProgress 5s linear forwards',
            }} />
        </div>,
        document.body
    );
};

//  Provider 
export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [notif, setNotif] = useState(null);
    const socketRef = useRef(null);
    const { user } = useContext(UserContext) || {};

    const totalUnread = Object.values(unreadCounts).reduce((s, v) => s + (v || 0), 0);


    const clearUnread = useCallback((id) => {
        setUnreadCounts(prev => ({ ...prev, [id]: 0 }));
    }, []);


    const setInitialUnread = useCallback((counts) => {
        setUnreadCounts(counts);
    }, []);

    // Socket setup
    useEffect(() => {
        if (!user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setOnlineUsers([]);
            }
            return;
        }

        if (socketRef.current) {
            if (!socketRef.current.connected) socketRef.current.connect();
            return;
        }

        const newSocket = io(BASE_URL, {
            path: "/socket.io",
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling'],
        });
        socketRef.current = newSocket;
        setSocket(newSocket);

        newSocket.on("connect", () => {
            //   console.log("Socket connected:", newSocket.id);
            newSocket.emit("register_user", user._id);
        });
        newSocket.on("reconnect", () => {
            newSocket.emit("register_user", user._id);
        });
        newSocket.on("disconnect", (reason) => {
            if (reason === "io server disconnect") newSocket.connect();
        });
        newSocket.on("connect_error", (err) => {
            // console.error("Socket error:", err.message);
        });
        newSocket.on("get_online_users", (users) => {
            setOnlineUsers(users);
        });

        // Global new-message listener 
        newSocket.on("conversation_updated", (data) => {
            const msg = data.lastMessage;
            if (!msg) return;
            const senderId = msg.sender?._id || msg.sender;
            if (senderId === user._id) return; // Khud ke messages ignore

            // Only increment unread + show toast if NOT currently on /chat
            const onChat = window.location.pathname.startsWith('/chat');

            if (!onChat) {
                // Increment global unread count
                setUnreadCounts(prev => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));

                // Build preview text
                let preview = msg.text || '';
                if (!preview && msg.fileTransfer?.fileName) {
                    const ft = msg.fileTransfer;
                    if (/image/i.test(ft.fileType)) preview = '📷 Photo';
                    else if (/video/i.test(ft.fileType)) preview = '🎥 Video';
                    else if (/audio/i.test(ft.fileType)) preview = '🎵 Audio';
                    else preview = `📎 ${ft.fileName}`;
                }
                if (!preview) preview = 'Sent you a message';

                const avatarUrl = msg.sender?.profileImageUrl
                    ? (msg.sender.profileImageUrl.startsWith('http')
                        ? msg.sender.profileImageUrl
                        : `${BASE_URL}${msg.sender.profileImageUrl}`)
                    : null;

                setNotif({
                    senderName: msg.sender?.name || 'Someone',
                    preview: preview.slice(0, 60),
                    avatar: avatarUrl,
                    senderId,
                });
            }
        });

        return () => {
            newSocket.off("connect");
            newSocket.off("reconnect");
            newSocket.off("disconnect");
            newSocket.off("get_online_users");
            newSocket.off("conversation_updated");
            newSocket.disconnect();
            socketRef.current = null;
            setSocket(null);
        };
    }, [user]);

    const handleNotifOpen = () => {
        setNotif(null);
        window.location.href = '/chat';
    };

    return (
        <SocketContext.Provider value={{ socket, onlineUsers, unreadCounts, totalUnread, clearUnread, setInitialUnread }}>
            {children}
            {notif && (
                <ChatNotifToast
                    notif={notif}
                    onDismiss={() => setNotif(null)}
                    onOpen={handleNotifOpen}
                />
            )}
            <style>{`
                @keyframes cnToastIn {
                    from { opacity: 0; transform: translateY(16px) scale(0.95); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes cnProgress {
                    from { width: 100%; }
                    to   { width: 0%; }
                }
            `}</style>
        </SocketContext.Provider>
    );
};
