import React, { useState, useEffect, useRef, useContext } from 'react';
import UserList from './UserList';
import MessageArea from './MessageArea';
import ProfileInfoPanel from './ProfileInfoPanel';
import { useSocket } from '../../context/SocketContext';
import { useUserAuth } from '../../hooks/useUserAuth';
import { UserContext } from '../../context/userContext';
import axiosInstance from '../../utils/axiosInstance';

const PANEL_MIN_WIDTH = 220;
const PANEL_MAX_WIDTH = 520;

const ChatInterface = () => {
    useUserAuth();

    const { socket, onlineUsers, unreadCounts, setInitialUnread, clearUnread, activeConvIdRef } = useSocket();
    const { user: currentUser } = useContext(UserContext);

    const [users, setUsers] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedConvId, setSelectedConvId] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [activePanel, setActivePanel] = useState('list');

    const [leftWidth, setLeftWidth] = useState(300);
    const [rightWidth, setRightWidth] = useState(300);
    const leftDragging = useRef(false);
    const rightDragging = useRef(false);
    const containerRef = useRef(null);

    useEffect(() => {
        fetchUsers();
        fetchConversations();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axiosInstance.get('/api/users/chat-list');
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch users', err);
        }
    };

    const fetchConversations = async () => {
        try {
            const res = await axiosInstance.get('/api/chat/conversations');
            const convs = Array.isArray(res.data) ? res.data : [];
            setConversations(convs);
            const counts = {};
            convs.forEach((conv) => {
                const key = conv.isGroup
                    ? conv._id
                    : conv.participants?.find((p) => (p._id || p) !== currentUser?._id)?._id;
                if (!key) return;

                if (conv.unreadCount > 0) {
                    counts[key] = conv.unreadCount;
                } else {
                    const lastMsg = conv.lastMessage;
                    if (lastMsg && lastMsg.status !== 'seen' &&
                        (lastMsg.sender?._id || lastMsg.sender) !== currentUser?._id) {
                        counts[key] = (counts[key] || 0) + 1;
                    }
                }
            });
            setInitialUnread(counts);
        } catch (err) {
            console.error('Failed to fetch conversations', err);
        }
    };

    // Socket event handlers for conversation-level updates.
    useEffect(() => {
        if (!socket) return;

        const handleConvUpdated = (data) => {
            setConversations((prev) => {
                const idx = prev.findIndex((c) => c._id === data.conversationId);
                if (idx === -1) return prev;
                const updated = [...prev];
                updated[idx] = { ...updated[idx], lastMessage: data.lastMessage, lastMessageAt: data.lastMessageAt };
                return updated.sort((a, b) =>
                    new Date(b.lastMessageAt || b.updatedAt) - new Date(a.lastMessageAt || a.updatedAt)
                );
            });


            const msg = data.lastMessage;
            if (!msg) return;
            const senderId = msg.sender?._id || msg.sender;
            if (senderId === currentUser?._id) return;
            if (selectedUser && selectedUser._id === senderId) {
                clearUnread(senderId);
            }
        };

        const handleGroupCreated = (group) => {
            setConversations((prev) => [group, ...prev]);
        };

        const handleGroupUpdated = (group) => {
            setConversations((prev) => prev.map((c) => (c._id === group._id ? group : c)));
            if (selectedGroup?._id === group._id) setSelectedGroup(group);
        };

        const handleConvDeleted = ({ conversationId }) => {
            setConversations((prev) => prev.filter((c) => c._id !== conversationId));
            if (selectedGroup?._id === conversationId || selectedConvId === conversationId) {
                setSelectedGroup(null);
                setSelectedUser(null);
                setSelectedConvId(null);
                if (activeConvIdRef) activeConvIdRef.current = null;
                setActivePanel('list');
            }
        };

        const handleMessagesSeen = ({ conversationId }) => {
            setConversations((prev) => {
                const conv = prev.find((c) => c._id === conversationId);
                if (!conv) return prev;
                const clearId = conv.isGroup
                    ? conv._id
                    : conv.participants?.find((p) => (p._id || p) !== currentUser?._id)?._id;
                if (clearId) clearUnread(clearId);
                return prev;
            });
        };

        socket.on('conversation_updated', handleConvUpdated);
        socket.on('group_created', handleGroupCreated);
        socket.on('group_updated', handleGroupUpdated);
        socket.on('conversation_deleted', handleConvDeleted);
        socket.on('messages_seen', handleMessagesSeen);

        return () => {
            socket.off('conversation_updated', handleConvUpdated);
            socket.off('group_created', handleGroupCreated);
            socket.off('group_updated', handleGroupUpdated);
            socket.off('conversation_deleted', handleConvDeleted);
            socket.off('messages_seen', handleMessagesSeen);
        };
    }, [socket, selectedUser, currentUser, selectedGroup, selectedConvId, clearUnread, activeConvIdRef]);

    // Panel resize drag handlers.
    useEffect(() => {
        const onMouseMove = (e) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            if (leftDragging.current) {
                setLeftWidth(Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, e.clientX - rect.left)));
            }
            if (rightDragging.current) {
                setRightWidth(Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, rect.right - e.clientX)));
            }
        };
        const onMouseUp = () => {
            leftDragging.current = false;
            rightDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    const handleSelectUser = (user, convId) => {
        setSelectedUser(user);
        setSelectedGroup(null);
        setSelectedConvId(convId || null);
        setActivePanel('chat');
        clearUnread(user._id);

        if (activeConvIdRef) activeConvIdRef.current = convId || null;
    };

    const handleSelectGroup = (group) => {
        setSelectedGroup(group);
        setSelectedUser(null);
        setSelectedConvId(group._id);
        setActivePanel('chat');
        clearUnread(group._id);
        if (activeConvIdRef) activeConvIdRef.current = group._id;
    };

    const handleOpenProfile = () => setActivePanel('profile');
    const handleBackToChat = () => setActivePanel('chat');
    const handleBackToList = () => {
        setActivePanel('list');
        if (activeConvIdRef) activeConvIdRef.current = null;
    };

    const handleGroupUpdated = (updatedGroup) => {
        setSelectedGroup(updatedGroup);
        setConversations((prev) => prev.map((c) => (c._id === updatedGroup._id ? updatedGroup : c)));
    };

    const handleGroupDeleted = (groupId) => {
        setConversations((prev) => prev.filter((c) => c._id !== groupId));
        setSelectedGroup(null);
        setSelectedConvId(null);
        if (activeConvIdRef) activeConvIdRef.current = null;
        setActivePanel('list');
    };

    const isProfileVisible = activePanel === 'profile';

    return (
        <div className="ci-root" ref={containerRef}>
            {/* User / group list panel */}
            <div
                className={`ci-panel ci-panel-list ${activePanel === 'list' ? 'ci-active' : ''}`}
                style={{ width: `${leftWidth}px`, minWidth: `${leftWidth}px` }}
            >
                <UserList
                    users={users}
                    onlineUsers={onlineUsers}
                    onSelectUser={handleSelectUser}
                    onSelectGroup={handleSelectGroup}
                    selectedUser={selectedUser}
                    selectedGroup={selectedGroup}
                    conversations={conversations}
                    unreadCounts={unreadCounts}
                    currentUser={currentUser}
                    onGroupCreated={fetchConversations}
                />
            </div>

            {/* Resizable divider  left */}
            <div
                className="ci-resize-handle"
                onMouseDown={() => {
                    leftDragging.current = true;
                    document.body.style.cursor = 'col-resize';
                    document.body.style.userSelect = 'none';
                }}
            >
                <div className="ci-resize-dot" />
                <div className="ci-resize-dot" />
                <div className="ci-resize-dot" />
            </div>

            {/* Chat  area panel */}
            <div className={`ci-panel ci-panel-chat ${activePanel === 'chat' ? 'ci-active' : ''}`}>
                <MessageArea
                    selectedUser={selectedUser}
                    selectedGroup={selectedGroup}
                    currentUser={currentUser}
                    onOpenProfile={handleOpenProfile}
                    conversationId={selectedConvId}
                    onBack={handleBackToList}
                />
            </div>

            {/* Resizable divider  right */}
            <div
                className="ci-resize-handle"
                style={{ display: isProfileVisible ? 'flex' : 'none' }}
                onMouseDown={() => {
                    rightDragging.current = true;
                    document.body.style.cursor = 'col-resize';
                    document.body.style.userSelect = 'none';
                }}
            >
                <div className="ci-resize-dot" />
                <div className="ci-resize-dot" />
                <div className="ci-resize-dot" />
            </div>

            {/* Profile / group info panel */}
            <div
                className={`ci-panel ci-panel-profile ${isProfileVisible ? 'ci-active' : ''}`}
                style={{
                    width: isProfileVisible ? `${rightWidth}px` : 0,
                    minWidth: isProfileVisible ? `${rightWidth}px` : 0,
                }}
            >
                <ProfileInfoPanel
                    user={selectedUser}
                    group={selectedGroup}
                    currentUser={currentUser}
                    users={users}
                    conversationId={selectedConvId}
                    onClose={handleBackToChat}
                    onGroupUpdated={handleGroupUpdated}
                    onGroupDeleted={handleGroupDeleted}
                />
            </div>

            <style>{`
                @keyframes ciSlideIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
};

export default ChatInterface;
