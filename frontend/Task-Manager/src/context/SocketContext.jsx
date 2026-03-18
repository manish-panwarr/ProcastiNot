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

        //Always destroy stale/disconnected socket before creating new one
        if (socketRef.current) {
            if (socketRef.current.connected) return; // already live → do nothing
            // Socket exists but is dead — destroy it so we can create a fresh one
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        // Get JWT token for socket auth (needed on Render to identify user on handshake)
        const token = localStorage.getItem("token");

        const newSocket = io(BASE_URL, {
            path: "/socket.io",
            transports: ["polling", "websocket"],
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 45000,
            auth: token ? { token } : {},
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        newSocket.on("connect", () => {
            console.log("Socket connected:", newSocket.id, "| transport:", newSocket.io.engine.transport.name);
            newSocket.emit("register_user", user._id);
        });

        // Re-register on ANY reconnect attempt (covers network drops, Render sleep wakes)
        newSocket.on("reconnect", (attemptNumber) => {
            console.log(`Socket reconnected after ${attemptNumber} attempts`);
            newSocket.emit("register_user", user._id);
        });

        newSocket.on("reconnect_attempt", (attemptNumber) => {
            console.log(`Reconnect attempt #${attemptNumber}`);
        });

        newSocket.on("disconnect", (reason) => {
            console.warn("Socket disconnected:", reason);
            // If server forcefully disconnects, manually reconnect
            if (reason === "io server disconnect") {
                newSocket.connect();
            }
            // For all other reasons (transport close, ping timeout, etc.)
            // socket.io auto-reconnects because reconnection: true
        });

        newSocket.on("connect_error", (err) => {
            console.error("❌ Socket connect_error:", err.message);
        });

        newSocket.on("get_online_users", (users) => {
            setOnlineUsers(users);
        });

        // Global new-message listener — fires for every participant on every new message
        newSocket.on("conversation_updated", (data) => {
            const msg = data.lastMessage;
            if (!msg) return;

            // Normalize IDs to string for safe comparison
            const senderId = String(msg.sender?._id || msg.sender || '');
            const myId = String(user._id);
            if (senderId === myId) return; // Ignore own messages

            const convId = String(data.conversationId || '');

            // Only show toast + increment unread if NOT already viewing this conversation
            const onThisConv = window.location.pathname.startsWith('/chat') &&
                window.location.search.includes(convId);
            // Also skip if on /chat but no specific conv in URL (general chat page case handled by chat component)
            const onChat = window.location.pathname.startsWith('/chat');

            if (!onThisConv) {
                // Key unread by conversationId so it matches with clearUnread calls
                setUnreadCounts(prev => ({ ...prev, [convId]: (prev[convId] || 0) + 1 }));
            }

            if (!onChat) {
                let preview = msg.text || '';
                if (!preview && msg.fileTransfer?.fileName) {
                    const ft = msg.fileTransfer;
                    if (/image/i.test(ft.fileType)) preview = 'Photo';
                    else if (/video/i.test(ft.fileType)) preview = 'Video';
                    else if (/audio/i.test(ft.fileType)) preview = 'Audio';
                    else preview = ft.fileName;
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
                    convId,
                });
            }
        });

        // ✅ Keep-alive ping every 20s to prevent Render from dropping idle connections
        // Render's free tier disconnects anything idle for >30s
        const keepAliveInterval = setInterval(() => {
            if (newSocket.connected) {
                newSocket.emit("ping_server");
            }
        }, 20000);

        return () => {
            clearInterval(keepAliveInterval);
            newSocket.removeAllListeners();
            newSocket.disconnect();
            socketRef.current = null;
            setSocket(null);
        };
    }, [user?._id]);  // ✅ Depend on user._id not user object — prevents re-running on unrelated re-renders

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
