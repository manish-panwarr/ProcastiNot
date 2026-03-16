import React, { useState, useEffect } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { getInitials } from "../../utils/helper";
import { useSocket } from "../../context/SocketContext";
import ConfirmDialog from "./ConfirmDialog";
import { BASE_URL } from "../../utils/apiPaths";

const ProfileInfoPanel = ({
    user,
    group,
    currentUser,
    users,
    conversationId,
    onClose,
    onGroupUpdated,
    onGroupDeleted,
}) => {
    const [sharedFiles, setSharedFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("info");
    const [messagingMode, setMessagingMode] = useState(
        group?.messagingMode || "everyone",
    );
    const [isEditingName, setIsEditingName] = useState(false);
    const [toast, setToast] = useState(null);
    const [showAllFiles, setShowAllFiles] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const { socket } = useSocket();

    const getFullUrl = (path) => {
        if (!path) return "";
        return path.startsWith("http") ? path : `${BASE_URL}${path}`;
    };

    const isGroup = !!group;
    const targetUser = user;

    const isSystemAdmin =
        currentUser?.role === "admin" || currentUser?.role === "manager";
    const isGroupAdmin = group?.groupAdmins?.some(
        (a) => (a._id || a) === currentUser?._id,
    );
    const isGroupCreator =
        group?.createdBy?._id === currentUser?._id ||
        group?.createdBy === currentUser?._id;
    const canManageGroup = isSystemAdmin || isGroupAdmin || isGroupCreator;

    const maxAdmins = group ? group.participants?.length || 0 : 0;
    const currentAdminCount = group?.groupAdmins?.length || 0;

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (conversationId) fetchSharedFiles();
    }, [conversationId]);

    useEffect(() => {
        if (group) setMessagingMode(group.messagingMode || "everyone");
    }, [group]);

    useEffect(() => {
        if (!socket) return;
        const handleChatCleared = (data) => {
            if (data.conversationId === conversationId) setSharedFiles([]);
        };

        const handleNewMessage = (msg) => {
            if (msg.conversationId === conversationId && msg.fileTransfer && msg.fileTransfer.mediaUrl && msg.fileTransfer.status === "complete") {
                setSharedFiles(prev => {
                    if (prev.some(m => m._id === msg._id)) return prev;
                    return [msg, ...prev]; // Latest first
                });
            }
        };

        socket.on("chat_cleared", handleChatCleared);
        socket.on("receive_message", handleNewMessage);
        socket.on("receive_group_message", handleNewMessage);

        return () => {
            socket.off("chat_cleared", handleChatCleared);
            socket.off("receive_message", handleNewMessage);
            socket.off("receive_group_message", handleNewMessage);
        };
    }, [socket, conversationId]);

    const fetchSharedFiles = async () => {
        setLoadingFiles(true);
        try {
            const res = await axiosInstance.get(
                `/api/chat/shared-files/${conversationId}`,
            );
            setSharedFiles(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to load shared files", err);
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleUpdateGroup = async (payload) => {
        setSaving(true);
        try {
            const res = await axiosInstance.put(
                `/api/chat/group/${conversationId}`,
                payload,
            );
            onGroupUpdated(res.data);
            showToast("Group updated successfully");
        } catch (err) {
            showToast(
                err.response?.data?.message || "Failed to update group",
                "error",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleToggleMessagingMode = async () => {
        const newMode = messagingMode === "everyone" ? "admin_only" : "everyone";
        setMessagingMode(newMode);
        await handleUpdateGroup({ messagingMode: newMode });
    };

    const handlePromoteAdmin = async (userId) => {
        await handleUpdateGroup({ promoteAdminId: userId });
    };

    const handleDemoteAdmin = async (userId) => {
        await handleUpdateGroup({ demoteAdminId: userId });
    };

    const handleRemoveMember = async (userId) => {
        await handleUpdateGroup({ removeMemberId: userId });
    };

    const handleAddMembers = async (memberIds) => {
        await handleUpdateGroup({ addMemberIds: memberIds });
        setShowAddMemberModal(false);
    };

    const handleDeleteGroup = async () => {
        setConfirmDialog({
            title: "Delete Group?",
            body: "Are you sure you want to delete this group? All messages and shared files will be permanently removed for everyone. This action cannot be undone.",
            confirmText: "Delete Group",
            confirmStyle: "danger",
            onConfirm: async () => {
                setConfirmDialog(null);
                setSaving(true);
                try {
                    await axiosInstance.delete(`/api/chat/conversation/${group._id}`);
                    showToast("Group deleted successfully");
                    if (onGroupDeleted) {
                        onGroupDeleted(group._id);
                    }
                    onClose();
                } catch (err) {
                    showToast(
                        err.response?.data?.message || "Failed to delete group",
                        "error",
                    );
                    setSaving(false);
                }
            },
            onCancel: () => setConfirmDialog(null),
        });
    };

    const getFileIcon = (fileType) => {
        if (!fileType)
            return (
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
            );
        if (fileType.startsWith("image/"))
            return (
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
            );
        if (fileType === "application/pdf")
            return (
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, color: "#ef4444" }}
                >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M16 13H8"></path>
                    <path d="M16 17H8"></path>
                    <path d="M10 9H8"></path>
                </svg>
            );
        if (fileType.includes("word"))
            return (
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, color: "#2563eb" }}
                >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M16 13H8"></path>
                    <path d="M16 17H8"></path>
                    <path d="M10 9H8"></path>
                </svg>
            );
        return (
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
            >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
        );
    };

    const formatSize = (bytes) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    const validSharedFiles = sharedFiles.filter(
        (msg) => msg && msg.fileTransfer && msg.fileTransfer.mediaUrl,
    );

    if (!user && !group) return null;

    return (
        <>
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    background: "#fff",
                    borderLeft: "1px solid #e8eef8",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    animation: "pipSlideIn 0.3s cubic-bezier(0.4,0,0.2,1)",
                }}
            >
                <div
                    style={{
                        padding: "14px 18px",
                        borderBottom: "1px solid #e8eef8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "#fff",
                        flexShrink: 0,
                        fontFamily: "'Poppins', sans-serif",
                    }}
                >
                    <span
                        style={{
                            fontWeight: "600",
                            fontSize: "15px",
                            color: "#0f172a",
                            letterSpacing: "-0.2px",
                        }}
                    >
                        {isGroup ? "Group Info" : "Profile Info"}
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            background: "#f1f5f9",
                            border: "none",
                            cursor: "pointer",
                            padding: "7px",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#64748b",
                            transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M18 6L6 18M6 6l12 12"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </div>

                {isGroup && (
                    <div
                        style={{
                            display: "flex",
                            background: "#f8fafc",
                            borderBottom: "1px solid #e8eef8",
                            padding: "4px 16px",
                            gap: "4px",
                            flexShrink: 0,
                        }}
                    >
                        {[
                            {
                                key: "info",
                                label: "Info",
                                icon: (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="9"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        />
                                        <path
                                            d="M12 8v4M12 16h.01"
                                            stroke="currentColor"
                                            strokeWidth="2.2"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                ),
                            },
                            {
                                key: "members",
                                label: "Members",
                                icon: (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                        <circle
                                            cx="9"
                                            cy="7"
                                            r="4"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        />
                                        <path
                                            d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                ),
                            },
                            {
                                key: "files",
                                label: "Files",
                                icon: (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                ),
                            },
                        ].map(({ key, label, icon }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                style={{
                                    flex: 1,
                                    padding: "8px 4px",
                                    border: "none",
                                    cursor: "pointer",
                                    borderRadius: "8px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    fontFamily: "'Poppins', sans-serif",
                                    background: activeTab === key ? "#fff" : "transparent",
                                    color: activeTab === key ? "#1368EC" : "#64748b",
                                    boxShadow:
                                        activeTab === key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                                    transition: "all 0.2s",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "5px",
                                }}
                            >
                                {icon}
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ flex: 1, overflowY: "auto" }}>
                    {isGroup ? (
                        <>
                            {activeTab === "info" && (
                                <div style={{ padding: "20px" }}>
                                    <div
                                        style={{
                                            textAlign: "center",
                                            marginBottom: "20px",
                                            position: "relative",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "80px",
                                                height: "80px",
                                                borderRadius: "20px",
                                                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "36px",
                                                margin: "0 auto 12px",
                                                boxShadow: "0 8px 24px rgba(124,58,237,0.3)",
                                                position: "relative",
                                                overflow: "hidden",
                                            }}
                                        >
                                            {group.groupAvatar ? (
                                                <img
                                                    src={getFullUrl(group.groupAvatar)}
                                                    alt=""
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                    }}
                                                />
                                            ) : (
                                                getInitials(group.groupName)
                                            )}
                                            {canManageGroup && (
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        inset: 0,
                                                        background: "rgba(0,0,0,0.4)",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        opacity: 0,
                                                        transition: "opacity 0.2s",
                                                        cursor: "pointer",
                                                    }}
                                                    onMouseOver={(e) =>
                                                        (e.currentTarget.style.opacity = 1)
                                                    }
                                                    onMouseOut={(e) =>
                                                        (e.currentTarget.style.opacity = 0)
                                                    }
                                                >
                                                    <label
                                                        style={{
                                                            cursor: "pointer",
                                                            color: "#fff",
                                                            fontSize: "10px",
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            alignItems: "center",
                                                        }}
                                                    >
                                                        <span
                                                            style={{ display: "flex", marginBottom: "4px" }}
                                                        >
                                                            <svg
                                                                width="18"
                                                                height="18"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            >
                                                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                                                <circle cx="12" cy="13" r="4"></circle>
                                                            </svg>
                                                        </span>
                                                        <span>Upload</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            style={{ display: "none" }}
                                                            onChange={async (e) => {
                                                                if (e.target.files?.[0]) {
                                                                    const formData = new FormData();
                                                                    formData.append(
                                                                        "groupAvatar",
                                                                        e.target.files[0],
                                                                    );
                                                                    await handleUpdateGroup(formData);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                    {group.groupAvatar && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUpdateGroup({ removeAvatar: true });
                                                            }}
                                                            title="Remove Avatar"
                                                            style={{
                                                                marginTop: "4px",
                                                                background: "#ef4444",
                                                                color: "#fff",
                                                                border: "none",
                                                                borderRadius: "4px",
                                                                padding: "2px 6px",
                                                                fontSize: "9px",
                                                                cursor: "pointer",
                                                            }}
                                                        ></button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {canManageGroup ? (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "8px",
                                                }}
                                            >
                                                {isEditingName ? (
                                                    <div style={{ display: "flex", gap: "4px" }}>
                                                        <input
                                                            autoFocus
                                                            defaultValue={group.groupName}
                                                            onBlur={() => setIsEditingName(false)}
                                                            onKeyDown={async (e) => {
                                                                if (e.key === "Enter") {
                                                                    if (
                                                                        e.target.value.trim() &&
                                                                        e.target.value !== group.groupName
                                                                    ) {
                                                                        await handleUpdateGroup({
                                                                            groupName: e.target.value.trim(),
                                                                        });
                                                                    }
                                                                    setIsEditingName(false);
                                                                } else if (e.key === "Escape") {
                                                                    setIsEditingName(false);
                                                                }
                                                            }}
                                                            style={{
                                                                padding: "4px 8px",
                                                                borderRadius: "6px",
                                                                border: "1px solid #1368EC",
                                                                outline: "none",
                                                                fontSize: "16px",
                                                                fontWeight: "800",
                                                                fontFamily: "inherit",
                                                                textAlign: "center",
                                                                width: "160px",
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <h2
                                                        style={{
                                                            margin: "0 0 4px",
                                                            fontSize: "18px",
                                                            fontWeight: "500",
                                                            color: "#0f172a",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "6px",
                                                        }}
                                                    >
                                                        {group.groupName}
                                                        <button
                                                            onClick={() => setIsEditingName(true)}
                                                            style={{
                                                                border: "none",
                                                                background: "none",
                                                                cursor: "pointer",
                                                                color: "#94a3b8",
                                                                padding: 0,
                                                                display: "flex",
                                                            }}
                                                            title="Edit Name"
                                                        >
                                                            <svg
                                                                width="14"
                                                                height="14"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            >
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                            </svg>
                                                        </button>
                                                    </h2>
                                                )}
                                            </div>
                                        ) : (
                                            <h2
                                                style={{
                                                    margin: "0 0 4px",
                                                    fontSize: "18px",
                                                    fontWeight: "500",
                                                    color: "#0f172a",
                                                }}
                                            >
                                                {group.groupName}
                                            </h2>
                                        )}

                                        <p
                                            style={{ margin: 0, fontSize: "13px", color: "#64748b" }}
                                        >
                                            {group.participants?.length || 0} members
                                        </p>
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "12px",
                                        }}
                                    >
                                        <InfoCard
                                            icon={
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                    <circle cx="12" cy="7" r="4"></circle>
                                                </svg>
                                            }
                                            label="Created By"
                                            value={group.createdBy?.name || "Unknown"}
                                        />
                                        <InfoCard
                                            icon={
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <rect
                                                        x="3"
                                                        y="4"
                                                        width="18"
                                                        height="18"
                                                        rx="2"
                                                        ry="2"
                                                    ></rect>
                                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                                </svg>
                                            }
                                            label="Created"
                                            value={new Date(group.createdAt).toLocaleDateString(
                                                "en-US",
                                                { day: "2-digit", month: "short", year: "numeric" },
                                            )}
                                        />
                                        <InfoCard
                                            icon={
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                                </svg>
                                            }
                                            label="Admins"
                                            value={`${currentAdminCount} admins`}
                                        />
                                    </div>

                                    {canManageGroup && (
                                        <div
                                            style={{
                                                marginTop: "20px",
                                                padding: "16px",
                                                background: "#f8fafc",
                                                borderRadius: "14px",
                                                border: "1px solid #e8eef8",
                                            }}
                                        >
                                            <p
                                                style={{
                                                    margin: "0 0 12px",
                                                    fontSize: "11px",
                                                    fontWeight: "700",
                                                    color: "#1368EC",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.6px",
                                                }}
                                            >
                                                Group Settings
                                            </p>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                }}
                                            >
                                                <div>
                                                    <p
                                                        style={{
                                                            margin: 0,
                                                            fontWeight: "600",
                                                            fontSize: "13px",
                                                            color: "#0f172a",
                                                        }}
                                                    >
                                                        Messaging Mode
                                                    </p>
                                                    <p
                                                        style={{
                                                            margin: "2px 0 0",
                                                            fontSize: "11px",
                                                            color: "#64748b",
                                                        }}
                                                    >
                                                        {messagingMode === "everyone"
                                                            ? "Everyone can send messages"
                                                            : "Only admins can send messages"}
                                                    </p>
                                                </div>
                                                <div
                                                    onClick={
                                                        !saving ? handleToggleMessagingMode : undefined
                                                    }
                                                    style={{
                                                        width: "46px",
                                                        height: "26px",
                                                        borderRadius: "13px",
                                                        background:
                                                            messagingMode === "everyone"
                                                                ? "#22c55e"
                                                                : "#94a3b8",
                                                        position: "relative",
                                                        cursor: saving ? "not-allowed" : "pointer",
                                                        transition: "background 0.3s",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            position: "absolute",
                                                            top: "3px",
                                                            left:
                                                                messagingMode === "everyone" ? "23px" : "3px",
                                                            width: "20px",
                                                            height: "20px",
                                                            borderRadius: "50%",
                                                            background: "#fff",
                                                            boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                                                            transition: "left 0.3s",
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            {(isGroupCreator || isGroupAdmin) && (
                                                <button
                                                    onClick={handleDeleteGroup}
                                                    disabled={saving}
                                                    style={{
                                                        marginTop: "16px",
                                                        width: "100%",
                                                        padding: "10px",
                                                        borderRadius: "10px",
                                                        border: "none",
                                                        background: "#fee2e2",
                                                        color: "#ef4444",
                                                        fontWeight: "500",
                                                        fontSize: "13px",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: "8px",
                                                    }}
                                                >
                                                    <svg
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                    >
                                                        <path
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                    Delete Group
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === "members" && (
                                <div style={{ padding: "14px 16px" }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            marginBottom: "12px",
                                            padding: "0 4px",
                                        }}
                                    >
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: "11px",
                                                fontWeight: "500",
                                                color: "#1368EC",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.6px",
                                            }}
                                        >
                                            {group.participants?.length || 0} Members
                                        </p>
                                        {canManageGroup && (
                                            <button
                                                onClick={() => setShowAddMemberModal(true)}
                                                style={{
                                                    background:
                                                        "linear-gradient(135deg, #1368EC, #2563eb)",
                                                    border: "none",
                                                    borderRadius: "8px",
                                                    padding: "6px 12px",
                                                    color: "#fff",
                                                    fontSize: "11px",
                                                    fontWeight: "700",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "5px",
                                                    cursor: "pointer",
                                                    boxShadow: "0 2px 6px rgba(19,104,236,0.3)",
                                                }}
                                            >
                                                <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                                Add Member
                                            </button>
                                        )}
                                    </div>
                                    {group.participants?.map((member) => {
                                        const memberId = member._id || member;
                                        const memberObj =
                                            typeof member === "object"
                                                ? member
                                                : { _id: member, name: "User" };
                                        const memberIsAdmin = group.groupAdmins?.some(
                                            (a) => (a._id || a) === memberId,
                                        );
                                        const memberIsCreator =
                                            (group.createdBy?._id || group.createdBy) === memberId;
                                        const isCurrentUser = memberId === currentUser?._id;

                                        return (
                                            <div
                                                key={memberId}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "10px",
                                                    padding: "10px 8px",
                                                    borderRadius: "12px",
                                                    transition: "background 0.15s",
                                                    marginBottom: "2px",
                                                }}
                                                onMouseOver={(e) =>
                                                    (e.currentTarget.style.background = "#f8fafc")
                                                }
                                                onMouseOut={(e) =>
                                                    (e.currentTarget.style.background = "transparent")
                                                }
                                            >
                                                <div
                                                    style={{
                                                        width: "38px",
                                                        height: "38px",
                                                        borderRadius: "50%",
                                                        background:
                                                            "linear-gradient(135deg, #1368EC, #3b82f6)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        color: "#fff",
                                                        fontWeight: "500",
                                                        fontSize: "13px",
                                                        flexShrink: 0,
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    {memberObj.profileImageUrl ? (
                                                        <img
                                                            src={memberObj.profileImageUrl}
                                                            alt=""
                                                            style={{
                                                                width: "100%",
                                                                height: "100%",
                                                                objectFit: "cover",
                                                            }}
                                                        />
                                                    ) : (
                                                        getInitials(memberObj.name)
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, overflow: "hidden" }}>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "6px",
                                                        }}
                                                    >
                                                        <p
                                                            style={{
                                                                margin: 0,
                                                                fontWeight: "600",
                                                                fontSize: "13px",
                                                                color: "#0f172a",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                        >
                                                            {memberObj.name || "User"}
                                                        </p>
                                                        {memberIsCreator && (
                                                            <span
                                                                style={{
                                                                    background: "#fef3c7",
                                                                    color: "#92400e",
                                                                    fontSize: "9px",
                                                                    fontWeight: "500",
                                                                    padding: "1px 6px",
                                                                    borderRadius: "6px",
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                Creator
                                                            </span>
                                                        )}
                                                        {memberIsAdmin && !memberIsCreator && (
                                                            <span
                                                                style={{
                                                                    background: "#eff6ff",
                                                                    color: "#1368EC",
                                                                    fontSize: "9px",
                                                                    fontWeight: "500",
                                                                    padding: "1px 6px",
                                                                    borderRadius: "6px",
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                Admin
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p
                                                        style={{
                                                            margin: 0,
                                                            fontSize: "11px",
                                                            color: "#64748b",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {memberObj.role || memberObj.department || ""}
                                                    </p>
                                                </div>
                                                {canManageGroup &&
                                                    !isCurrentUser &&
                                                    !memberIsCreator && (
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                gap: "4px",
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            {!memberIsAdmin && (
                                                                <button
                                                                    onClick={() => handlePromoteAdmin(memberId)}
                                                                    disabled={saving}
                                                                    title="Promote to Admin"
                                                                    style={{
                                                                        background: "#eff6ff",
                                                                        border: "none",
                                                                        borderRadius: "8px",
                                                                        padding: "5px 7px",
                                                                        cursor: "pointer",
                                                                        color: "#1368EC",
                                                                        fontSize: "11px",
                                                                        fontWeight: "700",
                                                                        fontFamily: "inherit",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: "4px",
                                                                    }}
                                                                >
                                                                    <svg
                                                                        width="12"
                                                                        height="12"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    >
                                                                        <line x1="12" y1="19" x2="12" y2="5"></line>
                                                                        <polyline points="5 12 12 5 19 12"></polyline>
                                                                    </svg>{" "}
                                                                    Admin
                                                                </button>
                                                            )}
                                                            {memberIsAdmin && (
                                                                <button
                                                                    onClick={() => handleDemoteAdmin(memberId)}
                                                                    disabled={saving}
                                                                    title="Remove Admin"
                                                                    style={{
                                                                        background: "#fef3c7",
                                                                        border: "none",
                                                                        borderRadius: "8px",
                                                                        padding: "5px 7px",
                                                                        cursor: "pointer",
                                                                        color: "#92400e",
                                                                        fontSize: "11px",
                                                                        fontWeight: "700",
                                                                        fontFamily: "inherit",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: "4px",
                                                                    }}
                                                                >
                                                                    <svg
                                                                        width="12"
                                                                        height="12"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    >
                                                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                                                        <polyline points="19 12 12 19 5 12"></polyline>
                                                                    </svg>{" "}
                                                                    Admin
                                                                </button>
                                                            )}
                                                            {isGroupCreator && (
                                                                <button
                                                                    onClick={() => handleRemoveMember(memberId)}
                                                                    disabled={saving}
                                                                    title="Remove Member"
                                                                    style={{
                                                                        background: "#fee2e2",
                                                                        border: "none",
                                                                        borderRadius: "8px",
                                                                        padding: "5px 7px",
                                                                        cursor: "pointer",
                                                                        color: "#ef4444",
                                                                        fontSize: "11px",
                                                                        fontWeight: "700",
                                                                        fontFamily: "inherit",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                    }}
                                                                >
                                                                    <svg
                                                                        width="12"
                                                                        height="12"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    >
                                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {activeTab === "files" && (
                                <div style={{ padding: "14px 16px" }}>
                                    <p
                                        style={{
                                            margin: "0 0 12px",
                                            fontSize: "11px",
                                            fontWeight: "700",
                                            color: "#1368EC",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.6px",
                                        }}
                                    >
                                        Shared Files
                                    </p>
                                    {loadingFiles ? (
                                        <p
                                            style={{
                                                fontSize: "12px",
                                                color: "#94a3b8",
                                                textAlign: "center",
                                                padding: "20px",
                                            }}
                                        >
                                            Loading...
                                        </p>
                                    ) : validSharedFiles.length === 0 ? (
                                        <div
                                            style={{
                                                textAlign: "center",
                                                padding: "30px 0",
                                                color: "#94a3b8",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "center",
                                                    marginBottom: "8px",
                                                }}
                                            >
                                                <svg
                                                    width="36"
                                                    height="36"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                                </svg>
                                            </div>
                                            <p style={{ fontSize: "12px", margin: 0 }}>
                                                No shared files yet
                                            </p>
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns:
                                                    "repeat(auto-fill, minmax(80px, 1fr))",
                                                gap: "10px",
                                            }}
                                        >
                                            {validSharedFiles.map((msg, i) => {
                                                const isImg =
                                                    msg.fileTransfer?.fileType?.startsWith("image/");
                                                const src = isImg
                                                    ? getFullUrl(msg.fileTransfer?.mediaUrl)
                                                    : null;
                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={() => setPreviewFile(msg.fileTransfer)}
                                                        title={msg.fileTransfer?.fileName}
                                                        style={{
                                                            aspectRatio: "1",
                                                            borderRadius: "12px",
                                                            background: "#f8fafc",
                                                            border: "1px solid #e8eef8",
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            cursor: "pointer",
                                                            overflow: "hidden",
                                                            position: "relative",
                                                        }}
                                                    >
                                                        {isImg ? (
                                                            <img
                                                                src={src}
                                                                alt=""
                                                                style={{
                                                                    width: "100%",
                                                                    height: "100%",
                                                                    objectFit: "cover",
                                                                }}
                                                            />
                                                        ) : (
                                                            <>
                                                                <span
                                                                    style={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        margin: "4px 0",
                                                                    }}
                                                                >
                                                                    {getFileIcon(msg.fileTransfer?.fileType)}
                                                                </span>
                                                                <span
                                                                    style={{
                                                                        fontSize: "9px",
                                                                        color: "#64748b",
                                                                        marginTop: "4px",
                                                                        overflow: "hidden",
                                                                        textOverflow: "ellipsis",
                                                                        whiteSpace: "nowrap",
                                                                        width: "100%",
                                                                        textAlign: "center",
                                                                        padding: "0 4px",
                                                                    }}
                                                                >
                                                                    {msg.fileTransfer?.fileName
                                                                        ?.split(".")
                                                                        .pop()
                                                                        ?.toUpperCase() || "FILE"}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ padding: "20px" }}>
                            {showAllFiles ? (
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        height: "100%",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            marginBottom: "20px",
                                        }}
                                    >
                                        <button
                                            onClick={() => setShowAllFiles(false)}
                                            style={{
                                                background: "#f1f5f9",
                                                border: "none",
                                                cursor: "pointer",
                                                padding: "8px 12px",
                                                borderRadius: "8px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                color: "#64748b",
                                                fontSize: "13px",
                                                fontWeight: "600",
                                                transition: "all 0.2s",
                                                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.background = "#e2e8f0";
                                                e.currentTarget.style.color = "#0f172a";
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.background = "#f1f5f9";
                                                e.currentTarget.style.color = "#64748b";
                                            }}
                                        >
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                            >
                                                <path
                                                    d="M15 19l-7-7 7-7"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                            Back to Profile
                                        </button>
                                        <span
                                            style={{
                                                marginLeft: "auto",
                                                fontWeight: "700",
                                                fontSize: "15px",
                                                color: "#0f172a",
                                            }}
                                        >
                                            All Shared Files
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                                "repeat(auto-fill, minmax(80px, 1fr))",
                                            gap: "10px",
                                            overflowY: "visible",
                                            paddingBottom: "20px",
                                        }}
                                    >
                                        {validSharedFiles.map((msg, i) => {
                                            const isImg =
                                                msg.fileTransfer?.fileType?.startsWith("image/");
                                            const src = isImg
                                                ? getFullUrl(msg.fileTransfer?.mediaUrl)
                                                : null;
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => setPreviewFile(msg.fileTransfer)}
                                                    title={msg.fileTransfer?.fileName}
                                                    style={{
                                                        aspectRatio: "1",
                                                        borderRadius: "12px",
                                                        background: "#f8fafc",
                                                        border: "1px solid #e8eef8",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        cursor: "pointer",
                                                        transition: "all 0.2s ease",
                                                        overflow: "hidden",
                                                        position: "relative",
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.transform =
                                                            "translateY(-2px)";
                                                        e.currentTarget.style.boxShadow =
                                                            "0 6px 16px rgba(0,0,0,0.08)";
                                                        e.currentTarget.style.borderColor = "#cbd5e1";
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.transform = "translateY(0)";
                                                        e.currentTarget.style.boxShadow = "none";
                                                        e.currentTarget.style.borderColor = "#e8eef8";
                                                    }}
                                                >
                                                    {isImg ? (
                                                        <img
                                                            src={src}
                                                            alt=""
                                                            style={{
                                                                width: "100%",
                                                                height: "100%",
                                                                objectFit: "cover",
                                                            }}
                                                        />
                                                    ) : (
                                                        <>
                                                            <span
                                                                style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    margin: "6px 0",
                                                                }}
                                                            >
                                                                {getFileIcon(msg.fileTransfer?.fileType)}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    fontSize: "9px",
                                                                    color: "#64748b",
                                                                    marginTop: "6px",
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    whiteSpace: "nowrap",
                                                                    width: "100%",
                                                                    textAlign: "center",
                                                                    padding: "0 6px",
                                                                    fontWeight: "500",
                                                                }}
                                                            >
                                                                {msg.fileTransfer?.fileName
                                                                    ?.split(".")
                                                                    .pop()
                                                                    ?.toUpperCase() || "FILE"}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ textAlign: "center", marginBottom: "24px" }}>
                                        <div
                                            style={{
                                                width: "84px",
                                                height: "84px",
                                                borderRadius: "50%",
                                                background: "linear-gradient(135deg, #1368EC, #3b82f6)",
                                                color: "#fff",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontWeight: "800",
                                                fontSize: "28px",
                                                margin: "0 auto 12px",
                                                overflow: "hidden",
                                                border: "3px solid #e8eef8",
                                                boxShadow: "0 8px 24px rgba(19,104,236,0.25)",
                                            }}
                                        >
                                            {targetUser.profileImageUrl ? (
                                                <img
                                                    src={getFullUrl(targetUser.profileImageUrl)}
                                                    alt={targetUser.name}
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                    }}
                                                />
                                            ) : (
                                                getInitials(targetUser.name)
                                            )}
                                        </div>
                                        <h2
                                            style={{
                                                margin: "0 0 6px",
                                                fontSize: "18px",
                                                fontWeight: "500",
                                                color: "#0f172a",
                                            }}
                                        >
                                            {targetUser.name}
                                        </h2>
                                        <span
                                            style={{
                                                fontSize: "12px",
                                                fontWeight: "700",
                                                padding: "4px 12px",
                                                borderRadius: "20px",
                                                background:
                                                    targetUser.role === "admin"
                                                        ? "#fef3c7"
                                                        : targetUser.role === "manager"
                                                            ? "#e8eef8"
                                                            : "#f1f5f9",
                                                color:
                                                    targetUser.role === "admin"
                                                        ? "#92400e"
                                                        : targetUser.role === "manager"
                                                            ? "#1368EC"
                                                            : "#64748b",
                                                textTransform: "capitalize",
                                            }}
                                        >
                                            {targetUser.role || "member"}
                                        </span>
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "10px",
                                            marginBottom: "28px",
                                        }}
                                    >
                                        {targetUser.department && (
                                            <InfoCard
                                                icon={
                                                    <svg
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <rect
                                                            x="4"
                                                            y="2"
                                                            width="16"
                                                            height="20"
                                                            rx="2"
                                                            ry="2"
                                                        ></rect>
                                                        <path d="M9 22v-4h6v4"></path>
                                                        <path d="M8 6h.01"></path>
                                                        <path d="M16 6h.01"></path>
                                                        <path d="M12 6h.01"></path>
                                                        <path d="M12 10h.01"></path>
                                                        <path d="M12 14h.01"></path>
                                                        <path d="M16 10h.01"></path>
                                                        <path d="M16 14h.01"></path>
                                                        <path d="M8 10h.01"></path>
                                                        <path d="M8 14h.01"></path>
                                                    </svg>
                                                }
                                                label="Department"
                                                value={targetUser.department}
                                            />
                                        )}
                                        <InfoCard
                                            icon={
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                    <polyline points="22,6 12,13 2,6"></polyline>
                                                </svg>
                                            }
                                            label="Email"
                                            value={targetUser.email}
                                            href={`mailto:${targetUser.email}`}
                                        />
                                        {targetUser.mobile && (
                                            <InfoCard
                                                icon={
                                                    <svg
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <rect
                                                            x="5"
                                                            y="2"
                                                            width="14"
                                                            height="20"
                                                            rx="2"
                                                            ry="2"
                                                        ></rect>
                                                        <line x1="12" y1="18" x2="12.01" y2="18"></line>
                                                    </svg>
                                                }
                                                label="Mobile"
                                                value={targetUser.mobile}
                                                href={`tel:${targetUser.mobile}`}
                                            />
                                        )}
                                        {targetUser.bio && (
                                            <InfoCard
                                                icon={
                                                    <svg
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <line x1="12" y1="16" x2="12" y2="12"></line>
                                                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                                    </svg>
                                                }
                                                label="Bio"
                                                value={targetUser.bio}
                                                multiline
                                            />
                                        )}
                                    </div>

                                    <div>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: "12px",
                                            }}
                                        >
                                            <p
                                                style={{
                                                    margin: "0",
                                                    fontSize: "11px",
                                                    fontWeight: "700",
                                                    color: "#1368EC",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.6px",
                                                }}
                                            >
                                                Shared Files
                                            </p>
                                            {validSharedFiles.length > 6 && (
                                                <button
                                                    onClick={() => setShowAllFiles(true)}
                                                    style={{
                                                        background: "#f1f5f9",
                                                        border: "none",
                                                        color: "#1368EC",
                                                        fontSize: "11px",
                                                        fontWeight: "700",
                                                        cursor: "pointer",
                                                        padding: "4px 10px",
                                                        borderRadius: "6px",
                                                        transition: "all 0.2s",
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.background = "#e2e8f0";
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.background = "#f1f5f9";
                                                    }}
                                                >
                                                    Show all
                                                </button>
                                            )}
                                        </div>
                                        {loadingFiles ? (
                                            <div
                                                style={{
                                                    padding: "20px 0",
                                                    background: "#f8fafc",
                                                    borderRadius: "12px",
                                                    border: "1px solid #e8eef8",
                                                    textAlign: "center",
                                                }}
                                            >
                                                <p
                                                    style={{
                                                        fontSize: "12px",
                                                        color: "#94a3b8",
                                                        margin: 0,
                                                        fontWeight: "500",
                                                    }}
                                                >
                                                    Loading files...
                                                </p>
                                            </div>
                                        ) : validSharedFiles.length === 0 ? (
                                            <div
                                                style={{
                                                    textAlign: "center",
                                                    padding: "30px 0",
                                                    background: "#f8fafc",
                                                    borderRadius: "12px",
                                                    border: "1px dashed #cbd5e1",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "center",
                                                        marginBottom: "8px",
                                                        opacity: 0.6,
                                                    }}
                                                >
                                                    <svg
                                                        width="32"
                                                        height="32"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                                    </svg>
                                                </div>
                                                <p
                                                    style={{
                                                        fontSize: "12px",
                                                        margin: 0,
                                                        color: "#94a3b8",
                                                        fontWeight: "500",
                                                    }}
                                                >
                                                    No files shared yet
                                                </p>
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    display: "grid",
                                                    gridTemplateColumns:
                                                        "repeat(auto-fill, minmax(80px, 1fr))",
                                                    gap: "10px",
                                                }}
                                            >
                                                {validSharedFiles.slice(0, 6).map((msg, i) => {
                                                    const isImg =
                                                        msg.fileTransfer?.fileType?.startsWith("image/");
                                                    const src = isImg
                                                        ? getFullUrl(msg.fileTransfer?.mediaUrl)
                                                        : null;
                                                    return (
                                                        <div
                                                            key={i}
                                                            onClick={() => setPreviewFile(msg.fileTransfer)}
                                                            title={msg.fileTransfer?.fileName}
                                                            style={{
                                                                aspectRatio: "1",
                                                                borderRadius: "12px",
                                                                background: "#f8fafc",
                                                                border: "1px solid #e8eef8",
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                cursor: "pointer",
                                                                transition: "all 0.2s ease",
                                                                overflow: "hidden",
                                                                position: "relative",
                                                            }}
                                                            onMouseOver={(e) => {
                                                                e.currentTarget.style.transform =
                                                                    "translateY(-2px)";
                                                                e.currentTarget.style.boxShadow =
                                                                    "0 6px 16px rgba(0,0,0,0.08)";
                                                                e.currentTarget.style.borderColor = "#cbd5e1";
                                                            }}
                                                            onMouseOut={(e) => {
                                                                e.currentTarget.style.transform =
                                                                    "translateY(0)";
                                                                e.currentTarget.style.boxShadow = "none";
                                                                e.currentTarget.style.borderColor = "#e8eef8";
                                                            }}
                                                        >
                                                            {isImg ? (
                                                                <img
                                                                    src={src}
                                                                    alt=""
                                                                    style={{
                                                                        width: "100%",
                                                                        height: "100%",
                                                                        objectFit: "cover",
                                                                    }}
                                                                />
                                                            ) : (
                                                                <>
                                                                    <span style={{ fontSize: "28px" }}>
                                                                        {getFileIcon(msg.fileTransfer?.fileType)}
                                                                    </span>
                                                                    <span
                                                                        style={{
                                                                            fontSize: "9px",
                                                                            color: "#64748b",
                                                                            marginTop: "6px",
                                                                            overflow: "hidden",
                                                                            textOverflow: "ellipsis",
                                                                            whiteSpace: "nowrap",
                                                                            width: "100%",
                                                                            textAlign: "center",
                                                                            padding: "0 6px",
                                                                            fontWeight: "500",
                                                                        }}
                                                                    >
                                                                        {msg.fileTransfer?.fileName
                                                                            ?.split(".")
                                                                            .pop()
                                                                            ?.toUpperCase() || "FILE"}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {toast && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "16px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        background:
                            toast.type === "error"
                                ? "linear-gradient(135deg, #1c0a0a, #450a0a)"
                                : "linear-gradient(135deg, #052e16, #14532d)",
                        border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                        color: "#f1f5f9",
                        fontWeight: "500",
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                        fontFamily: "'Poppins', sans-serif",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                        animation: "pipSlideIn 0.3s ease",
                    }}
                >
                    {toast.type === "error" ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M18 6L6 18M6 6l12 12"
                                stroke="#ef4444"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M20 6L9 17l-5-5"
                                stroke="#22c55e"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}
                    {toast.msg}
                </div>
            )}

            {previewFile && (
                <div
                    onClick={() => setPreviewFile(null)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 20000,
                        background: "rgba(0,0,0,0.85)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                        gap: "16px",
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "transparent",
                            maxWidth: "90vw",
                            maxHeight: "80vh",
                            display: "flex",
                            justifyContent: "center",
                        }}
                    >
                        {previewFile.fileType?.startsWith("image/") ? (
                            <img
                                src={getFullUrl(previewFile.mediaUrl)}
                                alt=""
                                style={{
                                    maxWidth: "100%",
                                    maxHeight: "80vh",
                                    borderRadius: "8px",
                                    boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
                                }}
                            />
                        ) : previewFile.fileType?.startsWith("video/") ? (
                            <video
                                src={getFullUrl(previewFile.mediaUrl)}
                                controls
                                autoPlay
                                style={{
                                    maxWidth: "100%",
                                    maxHeight: "80vh",
                                    borderRadius: "8px",
                                    background: "#000",
                                    boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
                                }}
                            />
                        ) : previewFile.fileType?.startsWith("audio/") ? (
                            <div
                                style={{
                                    background: "#fff",
                                    borderRadius: "16px",
                                    padding: "32px",
                                    textAlign: "center",
                                    minWidth: "300px",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        marginBottom: "16px",
                                    }}
                                >
                                    {getFileIcon(previewFile.fileType)}
                                </div>
                                <p
                                    style={{
                                        fontWeight: "700",
                                        marginBottom: "8px",
                                        fontSize: "16px",
                                        color: "#0f172a",
                                    }}
                                >
                                    {previewFile.fileName}
                                </p>
                                <audio
                                    src={getFullUrl(previewFile.mediaUrl)}
                                    controls
                                    autoPlay
                                    style={{
                                        width: "100%",
                                        marginTop: "16px",
                                        marginBottom: "16px",
                                    }}
                                />
                                <a
                                    href={getFullUrl(previewFile.mediaUrl)}
                                    download={previewFile.fileName}
                                    style={{
                                        display: "inline-block",
                                        padding: "10px 24px",
                                        background: "linear-gradient(135deg, #1368EC, #2563eb)",
                                        color: "#fff",
                                        borderRadius: "8px",
                                        textDecoration: "none",
                                        fontWeight: "600",
                                        fontSize: "13px",
                                    }}
                                >
                                    Download Audio
                                </a>
                            </div>
                        ) : (
                            <div
                                style={{
                                    background: "#fff",
                                    borderRadius: "16px",
                                    padding: "32px",
                                    textAlign: "center",
                                    minWidth: "300px",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        marginBottom: "16px",
                                    }}
                                >
                                    {getFileIcon(previewFile.fileType)}
                                </div>
                                <p
                                    style={{
                                        fontWeight: "700",
                                        marginBottom: "8px",
                                        fontSize: "16px",
                                        color: "#0f172a",
                                    }}
                                >
                                    {previewFile.fileName}
                                </p>
                                <p
                                    style={{
                                        fontSize: "13px",
                                        color: "#64748b",
                                        marginBottom: "24px",
                                    }}
                                >
                                    {formatSize(previewFile.fileSize)}
                                </p>
                                <a
                                    href={getFullUrl(previewFile.mediaUrl)}
                                    download={previewFile.fileName}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        display: "inline-block",
                                        padding: "12px 32px",
                                        background: "linear-gradient(135deg, #1368EC, #2563eb)",
                                        color: "#fff",
                                        borderRadius: "12px",
                                        textDecoration: "none",
                                        fontWeight: "700",
                                        fontSize: "14px",
                                        boxShadow: "0 4px 12px rgba(19,104,236,0.3)",
                                    }}
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ marginRight: "6px" }}
                                    >
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>{" "}
                                    Download
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {confirmDialog && (
                <ConfirmDialog
                    title={confirmDialog.title}
                    body={confirmDialog.body}
                    confirmText={confirmDialog.confirmText}
                    confirmStyle={confirmDialog.confirmStyle}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={confirmDialog.onCancel}
                />
            )}

            {showAddMemberModal && (
                <AddMembersModal
                    allUsers={users}
                    currentParticipants={group?.participants || []}
                    onClose={() => setShowAddMemberModal(false)}
                    onAdd={handleAddMembers}
                    loading={saving}
                />
            )}

            <style>{`
                @keyframes pipSlideIn {
                    from { opacity: 0; transform: translateX(30px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes ammSlideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </>
    );
};

const AddMembersModal = ({
    allUsers,
    currentParticipants,
    onClose,
    onAdd,
    loading,
}) => {
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);

    const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5000";
    const getFullUrlLocal = (path) => {
        if (!path) return "";
        return path.startsWith("http") ? path : `${BASE_URL}${path}`;
    };

    const participantIds = currentParticipants.map((p) =>
        (p._id || p).toString(),
    );
    const availableUsers = allUsers.filter(
        (u) => !participantIds.includes(u._id.toString()),
    );
    const filtered = availableUsers.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()),
    );

    const toggleUser = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 10000,
                background: "rgba(0,0,0,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(4px)",
                padding: "20px",
            }}
        >
            <div
                style={{
                    background: "#fff",
                    borderRadius: "24px",
                    width: "100%",
                    maxWidth: "400px",
                    maxHeight: "80vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
                    animation: "ammSlideUp 0.3s cubic-bezier(0.4,0,0.2,1)",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        padding: "24px 24px 16px",
                        borderBottom: "1px solid #f1f5f9",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "16px",
                        }}
                    >
                        <h3
                            style={{
                                margin: 0,
                                fontSize: "18px",
                                fontWeight: "700",
                                color: "#0f172a",
                                fontFamily: "'Poppins', sans-serif",
                            }}
                        >
                            Add New Members
                        </h3>
                        <button
                            onClick={onClose}
                            style={{
                                background: "#f1f5f9",
                                border: "none",
                                borderRadius: "50%",
                                width: "32px",
                                height: "32px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "14px",
                                color: "#64748b",
                                transition: "all 0.2s",
                            }}
                            onMouseOver={(e) =>
                                (e.currentTarget.style.background = "#e2e8f0")
                            }
                            onMouseOut={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                        >
                            ✕
                        </button>
                    </div>
                    <div style={{ position: "relative" }}>
                        <svg
                            style={{
                                position: "absolute",
                                left: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#94a3b8",
                            }}
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Find users to add..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px 12px 10px 36px",
                                borderRadius: "12px",
                                border: "2px solid #f1f5f9",
                                fontSize: "14px",
                                outline: "none",
                                boxSizing: "border-box",
                                fontFamily: "inherit",
                                background: "#f8fafc",
                                color: "#0f172a",
                                transition: "all 0.2s",
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = "#1368EC";
                                e.target.style.background = "#fff";
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = "#f1f5f9";
                                e.target.style.background = "#f8fafc";
                            }}
                        />
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
                    {filtered.length === 0 ? (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "40px 20px",
                                color: "#94a3b8",
                            }}
                        >
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: "500" }}>
                                {search
                                    ? "No users found"
                                    : "All users are already in the group"}
                            </p>
                        </div>
                    ) : (
                        filtered.map((u) => {
                            const isSelected = selectedIds.includes(u._id);
                            return (
                                <div
                                    key={u._id}
                                    onClick={() => toggleUser(u._id)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        padding: "10px 12px",
                                        borderRadius: "16px",
                                        cursor: "pointer",
                                        background: isSelected ? "#eff6ff" : "transparent",
                                        transition: "all 0.15s ease",
                                        margin: "2px 0",
                                    }}
                                    onMouseOver={(e) => {
                                        if (!isSelected)
                                            e.currentTarget.style.background = "#f8fafc";
                                    }}
                                    onMouseOut={(e) => {
                                        if (!isSelected)
                                            e.currentTarget.style.background = "transparent";
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "20px",
                                            height: "20px",
                                            borderRadius: "6px",
                                            border: `2px solid ${isSelected ? "#1368EC" : "#cbd5e1"}`,
                                            background: isSelected ? "#1368EC" : "#fff",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                            transition: "all 0.15s",
                                        }}
                                    >
                                        {isSelected && (
                                            <span
                                                style={{
                                                    color: "#fff",
                                                    fontSize: "11px",
                                                    fontWeight: "900",
                                                }}
                                            >
                                                ✓
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            width: "38px",
                                            height: "38px",
                                            borderRadius: "50%",
                                            background: "linear-gradient(135deg, #1368EC, #3b82f6)",
                                            color: "#fff",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "700",
                                            fontSize: "13px",
                                            overflow: "hidden",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {u.profileImageUrl ? (
                                            <img
                                                src={getFullUrlLocal(u.profileImageUrl)}
                                                alt=""
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                }}
                                            />
                                        ) : (
                                            getInitials(u.name)
                                        )}
                                    </div>
                                    <div style={{ flex: 1, overflow: "hidden" }}>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontWeight: "600",
                                                fontSize: "13px",
                                                color: "#0f172a",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {u.name}
                                        </p>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: "11px",
                                                color: "#64748b",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {u.role || u.department || "Member"}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div
                    style={{
                        padding: "20px 24px 24px",
                        borderTop: "1px solid #f1f5f9",
                        display: "flex",
                        gap: "12px",
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: "12px",
                            background: "#f1f5f9",
                            color: "#64748b",
                            border: "none",
                            borderRadius: "12px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onAdd(selectedIds)}
                        disabled={selectedIds.length === 0 || loading}
                        style={{
                            flex: 1,
                            padding: "12px",
                            background:
                                selectedIds.length === 0 || loading
                                    ? "#cbd5e1"
                                    : "linear-gradient(135deg, #1368EC, #2563eb)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "12px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor:
                                selectedIds.length === 0 || loading ? "not-allowed" : "pointer",
                            transition: "all 0.2s",
                            boxShadow:
                                selectedIds.length === 0 || loading
                                    ? "none"
                                    : "0 4px 12px rgba(19,104,236,0.3)",
                        }}
                    >
                        {loading
                            ? "Adding..."
                            : `Add ${selectedIds.length > 0 ? selectedIds.length : ""} Members`}
                    </button>
                </div>
            </div>
        </div>
    );
};

const InfoCard = ({ icon, label, value, href, multiline }) => (
    <div
        style={{
            display: "flex",
            gap: "10px",
            alignItems: multiline ? "flex-start" : "center",
            padding: "10px 12px",
            background: "#f8fafc",
            borderRadius: "12px",
            border: "1px solid #e8eef8",
        }}
    >
        <span
            style={{
                flexShrink: 0,
                marginTop: multiline ? "1px" : 0,
                display: "flex",
                color: "#64748b",
            }}
        >
            {icon}
        </span>
        <div style={{ flex: 1, overflow: "hidden" }}>
            <p
                style={{
                    fontSize: "10px",
                    color: "#94a3b8",
                    margin: "0 0 2px",
                    textTransform: "uppercase",
                    fontWeight: "700",
                    letterSpacing: "0.5px",
                }}
            >
                {label}
            </p>
            {href ? (
                <a
                    href={href}
                    style={{
                        fontSize: "13px",
                        color: "#1368EC",
                        textDecoration: "none",
                        fontWeight: "600",
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {value}
                </a>
            ) : (
                <p
                    style={{
                        fontSize: "13px",
                        color: "#0f172a",
                        margin: 0,
                        fontWeight: "500",
                        lineHeight: "1.4",
                        whiteSpace: multiline ? "pre-wrap" : "nowrap",
                        overflow: "hidden",
                        textOverflow: multiline ? "unset" : "ellipsis",
                    }}
                >
                    {value}
                </p>
            )}
        </div>
    </div>
);

export default ProfileInfoPanel;
