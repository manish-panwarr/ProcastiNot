import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { useSocket } from '../../context/SocketContext';
import { useWebRTC } from '../../context/WebRTCContext';
import ChatContextMenu from './ChatContextMenu';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toast';
import { getFileCategory, getFullUrl } from './chatUtils';
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { GrGroup } from 'react-icons/gr';


/**
 * MessageArea — main chat pane.
 * Handles loading, sending messages (standard DB and secure P2P WebRTC),
 * scroll tracking, and sockets.
 */
const MessageArea = ({ selectedUser, selectedGroup, currentUser, onOpenProfile, conversationId: passedConvId, onBack }) => {
    const { socket, onlineUsers, typingUsers } = useSocket();
    const { sendP2PMessage, p2pMessages, clearP2PMessages } = useWebRTC();
    const { addToast, ToastContainer } = useToast();

    //  State 
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [files, setFiles] = useState([]);
    const [sending, setSending] = useState(false);
    const [conversationId, setConversationId] = useState(passedConvId || null);
    const [contextMenu, setContextMenu] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [useP2P, setUseP2P] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);
    const [isInputExpanded, setIsInputExpanded] = useState(false);

    // Refs
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const textareaRef = useRef(null);
    const isNearBottomRef = useRef(true);
    const justSwitchedConvRef = useRef(false);

    //  Derived values 
    const isGroup = !!selectedGroup;
    const target = selectedGroup || selectedUser;

    const isTargetOnline = selectedUser
        ? onlineUsers.includes(selectedUser._id?.toString())
        : false;

    const isSystemAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
    const isGroupAdmin = selectedGroup?.groupAdmins?.some((a) => (a._id || a) === currentUser?._id);
    const canSendMessage = !isGroup || selectedGroup?.messagingMode === 'everyone' || isGroupAdmin || isSystemAdmin;

    // Sync passedConvId → local state when parent selects a new conversation.
    useEffect(() => {
        setConversationId(passedConvId || null);
    }, [passedConvId]);

    // Join / leave socket room for group conversations.
    useEffect(() => {
        if (!socket || !isGroup || !selectedGroup?._id) return;
        socket.emit('join_group', selectedGroup._id);
        return () => socket.emit('leave_group', selectedGroup._id);
    }, [socket, isGroup, selectedGroup?._id]);

    // Fetch messages whenever the selected contact/group changes.
    useEffect(() => {
        if (target) {
            justSwitchedConvRef.current = true;
            fetchMessages();
            handleCancelEdit();
        } else {
            setMessages([]);
            setConversationId(null);
            setFiles([]);
            setNewMessage('');
            setEditingMessage(null);
        }
    }, [selectedUser, selectedGroup]); // eslint-disable-line react-hooks/exhaustive-deps

    //  Socket event handlers 
    useEffect(() => {
        if (!socket) return;

        /**
         * Incoming 1-on-1 message from the server.
         * Appends the message and marks it as seen immediately.
         */
        const handleReceiveMessage = (message) => {
            const senderId = message.sender?._id || message.sender;

            if (isGroup && message.conversationId === conversationId) {
                // Deduplicate — the group socket room may deliver it twice.
                setMessages((prev) => prev.some((m) => m._id === message._id) ? prev : [...prev, message]);
                return;
            }

            if (!isGroup && selectedUser && String(senderId) === String(selectedUser._id)) {
                setMessages((prev) => prev.some((m) => m._id === message._id) ? prev : [...prev, message]);

                // Mark the conversation as seen immediately.
                if (conversationId) {
                    axiosInstance.put(`/api/chat/seen/${conversationId}`).catch(() => { });
                    socket.emit('mark_seen', { conversationId, senderId: selectedUser._id });
                }
            }
        };

        /**
         * Incoming group message broadcast.
         */
        const handleGroupMessage = (message) => {
            if (!isGroup || message.conversationId !== conversationId) return;
            setMessages((prev) => prev.some((m) => m._id === message._id) ? prev : [...prev, message]);

            // Mark group messages as seen so the badge clears immediately.
            if (conversationId) {
                axiosInstance.put(`/api/chat/seen/${conversationId}`).catch(() => { });
                socket.emit('mark_seen', { conversationId });
            }
        };

        const handleMessagesSeen = ({ conversationId: convId }) => {
            if (convId !== conversationId) return;
            setMessages((prev) =>
                prev.map((msg) => {
                    const sid = msg.sender?._id || msg.sender;
                    return sid === currentUser?._id && msg.status !== 'seen'
                        ? { ...msg, status: 'seen' }
                        : msg;
                })
            );
        };

        const handleMessageDeleted = ({ messageId, type, conversationId: convId }) => {
            if (convId !== conversationId) return;
            if (type === 'forEveryone') {
                setMessages((prev) =>
                    prev.map((m) =>
                        m._id === messageId ? { ...m, _isDeletedForEveryone: true, text: null, fileTransfer: null } : m
                    )
                );
            } else {
                setMessages((prev) => prev.filter((m) => m._id !== messageId));
            }
        };

        const handleChatCleared = ({ conversationId: convId }) => {
            if (convId === conversationId) {
                setMessages([]);
                if (selectedUser && clearP2PMessages) clearP2PMessages(selectedUser._id);
            }
        };

        const handleMessageEdited = ({ messageId, conversationId: convId, updatedMessage }) => {
            if (convId !== conversationId) return;
            setMessages((prev) =>
                prev.map((m) => (m._id === messageId ? updatedMessage : m))
            );
        };

        // P2P signalling handlers
        const handleP2pRequest = ({ senderId, senderName }) => {
            setConfirmDialog({
                title: `${senderName} wants to connect privately (P2P)`,
                body: 'Accept to enable encrypted direct chat. Your messages will bypass the server.',
                confirmText: 'Accept P2P',
                confirmStyle: 'primary',
                onConfirm: () => {
                    setConfirmDialog(null);
                    setUseP2P(true);
                    socket.emit('accept_p2p', { senderId });
                    addToast('P2P connection accepted! Establishing secure connection…', 'success');
                },
                onCancel: () => {
                    setConfirmDialog(null);
                    socket.emit('reject_p2p', { senderId });
                    addToast('P2P request declined', 'info');
                },
            });
        };

        const handleP2pAccepted = () => { setUseP2P(true); addToast('P2P accepted! You are now in private mode.', 'success'); };
        const handleP2pRejected = () => { setUseP2P(false); addToast('P2P request was declined by the other user.', 'error'); };
        const handleP2pCancelled = () => { setUseP2P(false); addToast('P2P mode was turned off by the other user.', 'info'); };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('receive_group_message', handleGroupMessage);
        socket.on('messages_seen', handleMessagesSeen);
        socket.on('message_deleted', handleMessageDeleted);
        socket.on('message_edited', handleMessageEdited);
        socket.on('chat_cleared', handleChatCleared);
        socket.on('p2p_request', handleP2pRequest);
        socket.on('p2p_accepted', handleP2pAccepted);
        socket.on('p2p_rejected', handleP2pRejected);
        socket.on('p2p_cancelled', handleP2pCancelled);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('receive_group_message', handleGroupMessage);
            socket.off('messages_seen', handleMessagesSeen);
            socket.off('message_deleted', handleMessageDeleted);
            socket.off('message_edited', handleMessageEdited);
            socket.off('chat_cleared', handleChatCleared);
            socket.off('p2p_request', handleP2pRequest);
            socket.off('p2p_accepted', handleP2pAccepted);
            socket.off('p2p_rejected', handleP2pRejected);
            socket.off('p2p_cancelled', handleP2pCancelled);
        };
    }, [socket, selectedUser, selectedGroup, conversationId, currentUser, isGroup, clearP2PMessages]);

    // Auto-scroll to bottom when messages change.
    useEffect(() => {
        const container = messagesContainerRef.current;
        const end = messagesEndRef.current;
        if (!container || !end) return;

        if (justSwitchedConvRef.current) {
            end.scrollIntoView({ behavior: 'instant' });
            justSwitchedConvRef.current = false;
            isNearBottomRef.current = true;
        } else if (isNearBottomRef.current) {
            end.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleScroll = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const { scrollTop, scrollHeight, clientHeight } = container;
        isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
    }, []);

    //  Data fetching 

    const fetchMessages = async () => {
        try {
            if (isGroup) {
                const msgRes = await axiosInstance.get(`/api/chat/messages/${selectedGroup._id}`);
                setMessages(msgRes.data);
                setConversationId(selectedGroup._id);
                await axiosInstance.put(`/api/chat/seen/${selectedGroup._id}`).catch(() => { });
                socket?.emit('mark_seen', { conversationId: selectedGroup._id });
                return;
            }

            // For DMs: look up conversation
            const res = await axiosInstance.get('/api/chat/conversations');
            const convs = Array.isArray(res.data) ? res.data : [];
            const conv = convs.find(
                (c) => !c.isGroup && c.participants?.some((p) => (p._id || p) === selectedUser._id)
            );
            if (conv) {
                setConversationId(conv._id);
                const msgRes = await axiosInstance.get(`/api/chat/messages/${conv._id}`);
                setMessages(msgRes.data);
                await axiosInstance.put(`/api/chat/seen/${conv._id}`).catch(() => { });
            } else {
                setConversationId(null);
                setMessages([]);
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    //  User interactions 

    const toggleInputExpand = () => {
        setIsInputExpanded((prev) => {
            const next = !prev;
            if (textareaRef.current) {
                if (next) {
                    textareaRef.current.style.height = '240px';
                } else {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 300) + 'px';
                }
            }
            return next;
        });
    };

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        const ta = e.target;
        if (!isInputExpanded) {
            ta.style.height = 'auto';
            ta.style.height = Math.min(ta.scrollHeight, 300) + 'px';
        }

        if (socket) {
            const typingPayload = isGroup ? { conversationId } : { recipientId: selectedUser?._id };
            socket.emit('typing', typingPayload);
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => socket.emit('stop_typing', typingPayload), 2000);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
        e.target.value = null;
    };

    const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

    const handleSend = async (e) => {
        e?.preventDefault();
        if ((!newMessage.trim() && files.length === 0) || !target || sending) return;
        if (!canSendMessage) {
            addToast('Only admins can send messages in this group', 'error');
            return;
        }

        if (editingMessage) {
            if (!newMessage.trim()) return;
            setSending(true);
            try {
                const res = await axiosInstance.put(`/api/chat/message/${editingMessage._id}`, {
                    text: newMessage.trim(),
                });
                setMessages((prev) =>
                    prev.map((m) => (m._id === editingMessage._id ? res.data : m))
                );
                addToast('Message updated', 'success');
                handleCancelEdit();
            } catch (err) {
                addToast(err.response?.data?.message || 'Failed to edit message', 'error');
            } finally {
                setSending(false);
            }
            return;
        }

        setSending(true);
        if (socket && conversationId) socket.emit('stop_typing', { conversationId });

        //  P2P send path 
        if (useP2P && !isGroup && selectedUser) {
            try {
                if (newMessage.trim()) await sendP2PMessage(selectedUser._id, newMessage.trim());

                if (files.length > 0) {
                    const p2pFiles = [];
                    const dbFiles = [];
                    files.forEach((file) => {
                        getFileCategory(file.type, file.name) === 'pdf' ? dbFiles.push(file) : p2pFiles.push(file);
                    });

                    for (const file of p2pFiles) {
                        try {
                            await sendP2PMessage(selectedUser._id, null, file);
                        } catch (fErr) {
                            addToast(`Failed to send ${file.name}: ${fErr.message}`, 'error');
                        }
                    }

                    if (dbFiles.length > 0) {
                        const formData = new FormData();
                        formData.append('recipientId', selectedUser._id);
                        dbFiles.forEach((file) => formData.append('files', file));
                        try {
                            const res = await axiosInstance.post('/api/chat/send', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                            });
                            const newMsgs = Array.isArray(res.data) ? res.data : [res.data];
                            setMessages((prev) => {
                                const unique = newMsgs.filter((m) => !prev.some((p) => p._id === m._id));
                                return [...prev, ...unique];
                            });
                        } catch (err) {
                            console.error('Failed to send DB files in P2P mode:', err);
                        }
                    }
                }

                setNewMessage('');
                setFiles([]);
                setIsInputExpanded(false);
            } catch (err) {
                console.error('P2P Send Error:', err);
                addToast(err.message || 'P2P send failed', 'error');
            } finally {
                setSending(false);
            }
            return;
        }

        //  DB send path 
        const msgText = newMessage.trim();
        const msgFiles = [...files];

        // Optimistic UI: show temporary sending messages
        const tempMsgs = [];
        if (msgText) {
            tempMsgs.push({
                _id: `temp-${Date.now()}-text`,
                text: msgText,
                sender: currentUser,
                status: 'sending',
                createdAt: new Date().toISOString(),
            });
        }
        msgFiles.forEach((file, i) => {
            const mediaUrl = (file.type.startsWith('image/') || file.type.startsWith('video/'))
                ? URL.createObjectURL(file)
                : null;
            tempMsgs.push({
                _id: `temp-${Date.now()}-file-${i}`,
                sender: currentUser,
                status: 'sending',
                fileTransfer: { fileName: file.name, fileType: file.type, fileSize: file.size, mediaUrl },
                createdAt: new Date().toISOString(),
            });
        });

        if (tempMsgs.length > 0) setMessages((prev) => [...prev, ...tempMsgs]);
        setNewMessage('');
        setFiles([]);
        setIsInputExpanded(false);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        try {
            const formData = new FormData();
            if (isGroup) formData.append('conversationId', selectedGroup._id);
            else formData.append('recipientId', selectedUser._id);
            if (msgText) formData.append('text', msgText);
            msgFiles.forEach((file) => formData.append('files', file));

            const res = await axiosInstance.post('/api/chat/send', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const newMsgs = Array.isArray(res.data) ? res.data : [res.data];
            const tempIds = new Set(tempMsgs.map((t) => t._id));
            setMessages((prev) => {
                const filtered = prev.filter((p) => !tempIds.has(p._id));
                const unique = newMsgs.filter((m) => !filtered.some((p) => p._id === m._id));
                return [...filtered, ...unique];
            });

            const lastMsg = newMsgs[newMsgs.length - 1];
            if (!conversationId && lastMsg?.conversationId) setConversationId(lastMsg.conversationId);
        } catch (err) {
            const tempIds = new Set(tempMsgs.map((t) => t._id));
            setMessages((prev) => prev.filter((p) => !tempIds.has(p._id)));
            addToast(err.response?.data?.message || 'Failed to send message', 'error');
        } finally {
            setSending(false);
            tempMsgs.forEach((m) => {
                if (m.fileTransfer?.mediaUrl?.startsWith('blob:')) {
                    URL.revokeObjectURL(m.fileTransfer.mediaUrl);
                }
            });
        }
    };

    const handleStartEdit = (messageId) => {
        const msgToEdit = allMessages.find((m) => m._id === messageId);
        if (msgToEdit) {
            setEditingMessage(msgToEdit);
            setNewMessage(msgToEdit.text);
            if (textareaRef.current) {
                textareaRef.current.focus();
                setTimeout(() => {
                    if (textareaRef.current) {
                        if (isInputExpanded) {
                            textareaRef.current.style.height = '240px';
                        } else {
                            textareaRef.current.style.height = 'auto';
                            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 300) + 'px';
                        }
                    }
                }, 50);
            }
        }
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
        setNewMessage('');
        setIsInputExpanded(false);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleContextMenu = (e, msg) => {
        e.preventDefault();
        e.stopPropagation();
        const senderId = msg.sender?._id || msg.sender;
        const hasText = !!msg.text;
        const hasFT = !!msg.fileTransfer?.fileName;
        const hasImg = !!(msg.image && !msg.fileTransfer);
        const canEdit = senderId === currentUser?._id && hasText && !hasFT && !hasImg && !msg.isP2P;
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            messageId: msg._id,
            isMe: senderId === currentUser?._id,
            canEdit: canEdit
        });
    };

    const deleteMessage = async (messageId, type) => {
        setConfirmDialog({
            title: type === 'forEveryone' ? 'Delete for everyone?' : 'Delete for me?',
            body: type === 'forEveryone'
                ? 'This message will be removed for all participants.'
                : 'This message will be removed only for you.',
            onConfirm: async () => {
                setConfirmDialog(null);
                try {
                    await axiosInstance.delete(`/api/chat/message/${messageId}?type=${type}`);
                    if (type === 'forEveryone') {
                        setMessages((prev) =>
                            prev.map((m) => m._id === messageId ? { ...m, _isDeletedForEveryone: true, text: null, fileTransfer: null } : m)
                        );
                    } else {
                        setMessages((prev) => prev.filter((m) => m._id !== messageId));
                    }
                    addToast('Message deleted', 'info');
                } catch {
                    addToast('Failed to delete message', 'error');
                }
            },
        });
    };

    const deleteMessageFromDB = async (messageId) => {
        setConfirmDialog({
            title: 'Delete from DB?',
            body: 'This will permanently remove the message from the database. This action cannot be undone.',
            confirmStyle: 'danger',
            onConfirm: async () => {
                setConfirmDialog(null);
                try {
                    await axiosInstance.delete(`/api/chat/admin/message/${messageId}`);
                    setMessages((prev) => prev.filter((m) => m._id !== messageId));
                    addToast('Message permanently deleted from DB', 'success');
                } catch {
                    addToast('Failed to delete message from DB', 'error');
                }
            },
        });
    };

    const handleDeleteAllChats = () => {
        const noContent = !conversationId &&
            (!selectedUser || !p2pMessages[selectedUser._id]?.length);
        if (noContent) { addToast('No conversation to delete', 'info'); return; }

        setConfirmDialog({
            title: 'Delete all messages?',
            body: 'Are you sure you want to delete all messages? This cannot be undone.',
            confirmText: 'Delete',
            onConfirm: async () => {
                setConfirmDialog(null);
                try {
                    if (conversationId) {
                        if (isGroup) await axiosInstance.delete(`/api/chat/clear/${conversationId}`);
                        else await axiosInstance.delete(`/api/chat/conversation/${conversationId}`);
                    }
                    setMessages([]);
                    if (selectedUser && clearP2PMessages) clearP2PMessages(selectedUser._id);
                    if (useP2P) setUseP2P(false);
                    addToast('Chat deleted successfully', 'success');
                } catch {
                    addToast('Failed to delete chat', 'error');
                }
            },
        });
    };

    //  Derived display data 

    const localP2P = (currentUser && !isGroup && selectedUser)
        ? (p2pMessages[selectedUser._id] || [])
        : [];

    const formattedP2P = localP2P.map((p) => ({
        _id: p.id || String(Date.now() + Math.random()),
        text: p.text || null,
        sender: String(p.senderId) === String(currentUser?._id) ? currentUser : selectedUser,
        fileTransfer: p.file ? {
            fileName: p.file.name,
            fileType: p.file.type,
            fileSize: p.file.size,
            mediaUrl: p.file.data,
        } : null,
        createdAt: p.timestamp || new Date().toISOString(),
        status: 'sent',
        isP2P: true,
    }));

    const allMessages = useMemo(
        () => [...messages, ...formattedP2P].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
        [messages, formattedP2P]
    );

    const { allConvImages, msgImageIndexMap } = useMemo(() => {
        const images = [];
        const indexMap = {};
        let counter = -1;
        allMessages.forEach((m, idx) => {
            if (m._isDeletedForEveryone) return;
            const ft = m.fileTransfer;
            const imgUrl = m.image && !ft ? m.image : null;
            const cat = ft?.fileName ? getFileCategory(ft.fileType, ft.fileName) : null;
            const hasImg = !!imgUrl;

            if (cat === 'image') {
                const s = ft.mediaUrl
                    ? (ft.mediaUrl.startsWith('http') || ft.mediaUrl.startsWith('data:') ? ft.mediaUrl : getFullUrl(ft.mediaUrl))
                    : null;
                if (s) {
                    images.push({ src: s, fileName: ft.fileName, fileSize: ft.fileSize });
                    indexMap[m._id || idx] = ++counter;
                }
            } else if (hasImg) {
                const s = imgUrl.startsWith('http') || imgUrl.startsWith('data:') ? imgUrl : getFullUrl(imgUrl);
                images.push({ src: s, fileName: 'image.jpg', fileSize: 0 });
                indexMap[m._id || idx] = ++counter;
            }
        });
        return { allConvImages: images, msgImageIndexMap: indexMap };
    }, [allMessages]);

    const typingParticipants = useMemo(() => {
        if (isGroup && selectedGroup?.participants) {
            return selectedGroup.participants.filter((p) => {
                const pid = p._id || p;
                return pid !== currentUser?._id && typingUsers[pid];
            });
        }
        if (!isGroup && selectedUser) {
            const uid = selectedUser._id || selectedUser;
            return typingUsers[uid] ? [uid] : [];
        }
        return [];
    }, [isGroup, selectedGroup, selectedUser, currentUser, typingUsers]);

    //  Empty state 
    if (!target) {
        return (
            <div className="flex flex-1 items-center justify-center h-full bg-gradient-to-br from-blue-50/50 to-slate-50">
                <div className="text-center text-slate-400">
                    <div className="flex justify-center mb-4 drop-shadow-md">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1368EC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <p className="text-xl font-extrabold text-slate-900 mb-2 tracking-tight">Select a conversation</p>
                    <p className="text-sm text-slate-500">Choose a contact or group to start chatting</p>
                </div>
            </div>
        );
    }

    //  Main render 
    const canSend = (newMessage.trim() || files.length > 0) && !sending && canSendMessage;

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
            <ToastContainer />

            {/* Chat header */}
            <ChatHeader
                selectedUser={selectedUser}
                selectedGroup={selectedGroup}
                currentUser={currentUser}
                onOpenProfile={onOpenProfile}
                onBack={onBack}
                useP2P={useP2P}
                setUseP2P={setUseP2P}
                socket={socket}
                addToast={addToast}
                isTargetOnline={isTargetOnline}
                handleDeleteAllChats={handleDeleteAllChats}
            />

            {/* Messages list */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 px-5 flex flex-col gap-2.5 bg-slate-50"
            >
                {allMessages.length === 0 && (
                    <div className="flex-1 flex items-center justify-center opacity-60">
                        <div className="text-center">
                            <div className="flex justify-center mb-3 text-slate-400">
                                {isGroup ? (
                                    <GrGroup className="text-4xl" />
                                ) : (
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z" />
                                        <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
                                    </svg>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 m-0">
                                {isGroup ? `Welcome to ${selectedGroup.groupName}!` : 'No messages yet. Say hello!'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Message bubbles */}
                {allMessages.map((msg, index) => (
                    <MessageBubble
                        key={msg._id || index}
                        msg={msg}
                        index={index}
                        currentUser={currentUser}
                        isGroup={isGroup}
                        handleContextMenu={handleContextMenu}
                        allConvImages={allConvImages}
                        msgImageIndexMap={msgImageIndexMap}
                    />
                ))}

                {/* Typing indicators */}
                <TypingIndicator count={typingParticipants.length} />

                <div ref={messagesEndRef} />
            </div>

            {/* Compose message input form */}
            <MessageInput
                newMessage={newMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                files={files}
                removeFile={removeFile}
                canSendMessage={canSendMessage}
                canSend={canSend}
                sending={sending}
                useP2P={useP2P}
                fileInputRef={fileInputRef}
                textareaRef={textareaRef}
                handleFileSelect={handleFileSelect}
                handleSend={handleSend}
                editingMessage={editingMessage}
                onCancelEdit={handleCancelEdit}
                isExpanded={isInputExpanded}
                onToggleExpand={toggleInputExpand}
            />

            {/* Context menu (right-click options) */}
            {contextMenu && (
                <ChatContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    isMe={contextMenu.isMe}
                    isAdmin={isSystemAdmin}
                    canEdit={contextMenu.canEdit}
                    onEdit={() => handleStartEdit(contextMenu.messageId)}
                    onDeleteForMe={() => deleteMessage(contextMenu.messageId, 'forMe')}
                    onDeleteForEveryone={() => deleteMessage(contextMenu.messageId, 'forEveryone')}
                    onDeleteFromDB={() => deleteMessageFromDB(contextMenu.messageId)}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {/* Action Confirmation Dialog */}
            {confirmDialog && (
                <ConfirmDialog
                    title={confirmDialog.title}
                    body={confirmDialog.body}
                    confirmText={confirmDialog.confirmText || 'Delete'}
                    confirmStyle={confirmDialog.confirmStyle || 'danger'}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={confirmDialog.onCancel || (() => setConfirmDialog(null))}
                />
            )}
        </div>
    );
};

export default MessageArea;
