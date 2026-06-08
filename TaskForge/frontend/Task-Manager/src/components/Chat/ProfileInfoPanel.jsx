import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { getInitials } from '../../utils/helper';
import { useSocket } from '../../context/SocketContext';
import ConfirmDialog from './ConfirmDialog';
import MediaModal from './MediaModal';
import InfoCard from './InfoCard';
import AddMemberModal from './AddMemberModal';
import GroupInfoTab from './GroupInfoTab';
import GroupMembersTab from './GroupMembersTab';
import SharedFilesTab from './SharedFilesTab';
import { getFullUrl, getFileCategory } from './chatUtils';

//@desc : Sidebar panel displaying detailed info about the selected user or group. 
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
    const [activeTab, setActiveTab] = useState('info');
    const [messagingMode, setMessagingMode] = useState(group?.messagingMode || 'everyone');
    const [toast, setToast] = useState(null);
    const [showAllFiles, setShowAllFiles] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const { socket } = useSocket();

    const isGroup = !!group;

    const isSystemAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
    const isGroupAdmin = group?.groupAdmins?.some((a) => (a._id || a) === currentUser?._id);
    const isGroupCreator = group?.createdBy?._id === currentUser?._id || group?.createdBy === currentUser?._id;
    const canManageGroup = isSystemAdmin || isGroupAdmin || isGroupCreator;

    const currentAdminCount = group?.groupAdmins?.length || 0;

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (conversationId) fetchSharedFiles();
    }, [conversationId]);

    useEffect(() => {
        if (group) setMessagingMode(group.messagingMode || 'everyone');
    }, [group]);

    useEffect(() => {
        if (!socket) return;
        const handleChatCleared = (data) => {
            if (data.conversationId === conversationId) setSharedFiles([]);
        };

        const handleNewMessage = (msg) => {
            if (
                msg.conversationId === conversationId &&
                msg.fileTransfer?.mediaUrl &&
                msg.fileTransfer?.status === 'complete'
            ) {
                setSharedFiles((prev) => {
                    if (prev.some((m) => m._id === msg._id)) return prev;
                    return [msg, ...prev]; // Latest first
                });
            }
        };

        socket.on('chat_cleared', handleChatCleared);
        socket.on('receive_message', handleNewMessage);
        socket.on('receive_group_message', handleNewMessage);

        return () => {
            socket.off('chat_cleared', handleChatCleared);
            socket.off('receive_message', handleNewMessage);
            socket.off('receive_group_message', handleNewMessage);
        };
    }, [socket, conversationId]);

    const fetchSharedFiles = async () => {
        setLoadingFiles(true);
        try {
            const res = await axiosInstance.get(`/api/chat/shared-files/${conversationId}`);
            setSharedFiles(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to load shared files', err);
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleUpdateGroup = async (payload) => {
        setSaving(true);
        try {
            const isFormData = payload instanceof FormData;
            const res = await axiosInstance.put(`/api/chat/group/${conversationId}`, payload, {
                headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
            });
            onGroupUpdated(res.data);
            showToast('Group updated successfully');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update group', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleMessagingMode = async () => {
        const newMode = messagingMode === 'everyone' ? 'admin_only' : 'everyone';
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
            title: 'Delete Group?',
            body: 'Are you sure you want to delete this group? All messages and shared files will be permanently removed for everyone. This action cannot be undone.',
            confirmText: 'Delete Group',
            confirmStyle: 'danger',
            onConfirm: async () => {
                setConfirmDialog(null);
                setSaving(true);
                try {
                    await axiosInstance.delete(`/api/chat/conversation/${group._id}`);
                    showToast('Group deleted successfully');
                    if (onGroupDeleted) onGroupDeleted(group._id);
                    onClose();
                } catch (err) {
                    showToast(err.response?.data?.message || 'Failed to delete group', 'error');
                    setSaving(false);
                }
            },
            onCancel: () => setConfirmDialog(null),
        });
    };

    const validSharedFiles = sharedFiles.filter(
        (msg) => msg?.fileTransfer?.mediaUrl
    );

    if (!user && !group) return null;

    return (
        <>
            <div className="w-full h-full bg-white border-l border-[#e8eef8] flex flex-col overflow-hidden animate-[pipSlideIn_0.3s_cubic-bezier(0.4,0,0.2,1)] relative font-sans">
                {/* Panel Header */}
                <div className="p-3.5 px-4 border-b border-[#e8eef8] flex items-center justify-between bg-white shrink-0">
                    <span className="font-semibold text-sm text-slate-900 tracking-tight">
                        {isGroup ? 'Group Info' : 'Profile Info'}
                    </span>
                    <button
                        onClick={onClose}
                        className="bg-slate-100 hover:bg-slate-200 border-none cursor-pointer p-1.5 rounded-lg flex items-center justify-center text-slate-500 transition-colors"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Toast alerts */}
                {toast && (
                    <div className={`absolute top-14 left-1/2 -translate-x-1/2 z-50 p-2.5 px-4 rounded-xl text-xs font-semibold shadow-md ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'
                        }`}>
                        {toast.msg}
                    </div>
                )}

                {/* Tabs for group profile */}
                {isGroup && (
                    <div className="flex bg-slate-50 border-b border-[#e8eef8] p-1 gap-1 shrink-0 font-bold text-[11px]">
                        {[
                            { key: 'info', label: 'Info', icon: '' },
                            { key: 'members', label: 'Members', icon: '' },
                            { key: 'files', label: 'Files', icon: '' },
                        ].map(({ key, label, icon }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`flex-1 py-2 border-none cursor-pointer rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${activeTab === key ? 'bg-white text-[#1368EC] shadow-xs' : 'bg-transparent text-slate-500'
                                    }`}
                            >
                                <span>{icon}</span>
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    {isGroup ? (
                        <>
                            {activeTab === 'info' && (
                                <GroupInfoTab
                                    group={group}
                                    currentUser={currentUser}
                                    canManageGroup={canManageGroup}
                                    isGroupCreator={isGroupCreator}
                                    isGroupAdmin={isGroupAdmin}
                                    currentAdminCount={currentAdminCount}
                                    messagingMode={messagingMode}
                                    saving={saving}
                                    handleUpdateGroup={handleUpdateGroup}
                                    handleToggleMessagingMode={handleToggleMessagingMode}
                                    handleDeleteGroup={handleDeleteGroup}
                                />
                            )}

                            {activeTab === 'members' && (
                                <GroupMembersTab
                                    group={group}
                                    currentUser={currentUser}
                                    canManageGroup={canManageGroup}
                                    isGroupCreator={isGroupCreator}
                                    saving={saving}
                                    handlePromoteAdmin={handlePromoteAdmin}
                                    handleDemoteAdmin={handleDemoteAdmin}
                                    handleRemoveMember={handleRemoveMember}
                                    setShowAddMemberModal={setShowAddMemberModal}
                                />
                            )}

                            {activeTab === 'files' && (
                                <SharedFilesTab
                                    loadingFiles={loadingFiles}
                                    validSharedFiles={validSharedFiles}
                                    setPreviewFile={setPreviewFile}
                                />
                            )}
                        </>
                    ) : (
                        <div className="p-5">
                            {showAllFiles ? (
                                <div className="flex flex-col h-full">
                                    <div className="flex items-center mb-5">
                                        <button
                                            onClick={() => setShowAllFiles(false)}
                                            className="bg-slate-100 hover:bg-slate-200 border-none cursor-pointer p-2 px-3 rounded-lg flex items-center gap-1.5 text-slate-500 text-xs font-semibold transition-all shadow-xs"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Back to Profile
                                        </button>
                                        <span className="ml-auto font-bold text-sm text-slate-900">
                                            All Shared Files
                                        </span>
                                    </div>
                                    <SharedFilesTab
                                        loadingFiles={loadingFiles}
                                        validSharedFiles={validSharedFiles}
                                        setPreviewFile={setPreviewFile}
                                    />
                                </div>
                            ) : (
                                <>
                                    {/* DM User Header info */}
                                    <div className="text-center mb-6">
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1368EC] to-[#3b82f6] flex items-center justify-center font-extrabold text-3xl text-white mx-auto mb-3 border-2 border-slate-100 shadow-md shadow-blue-500/10 overflow-hidden">
                                            {user.profileImageUrl ? (
                                                <img
                                                    src={getFullUrl(user.profileImageUrl)}
                                                    alt={user.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                getInitials(user.name)
                                            )}
                                        </div>
                                        <h2 className="m-0 mb-1.5 text-base font-semibold text-slate-900">
                                            {user.name}
                                        </h2>
                                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full text-slate-600 uppercase tracking-wider ${user.role === 'admin' ? 'bg-amber-100 text-amber-800' : user.role === 'manager' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {user.role || 'member'}
                                        </span>
                                    </div>

                                    {/* Info Cards */}
                                    <div className="flex flex-col gap-2.5 mb-6">
                                        {user.department && (
                                            <InfoCard
                                                icon={
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                                                        <path d="M9 22v-4h6v4" />
                                                        <path d="M8 6h.01" />
                                                        <path d="M16 6h.01" />
                                                        <path d="M12 6h.01" />
                                                        <path d="M12 10h.01" />
                                                        <path d="M12 14h.01" />
                                                        <path d="M16 10h.01" />
                                                        <path d="M16 14h.01" />
                                                        <path d="M8 10h.01" />
                                                        <path d="M8 14h.01" />
                                                    </svg>
                                                }
                                                label="Department"
                                                value={user.department}
                                            />
                                        )}
                                        <InfoCard
                                            icon={
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                                    <polyline points="22,6 12,13 2,6" />
                                                </svg>
                                            }
                                            label="Email"
                                            value={user.email}
                                            href={`mailto:${user.email}`}
                                        />
                                        {user.mobile && (
                                            <InfoCard
                                                icon={
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                                        <line x1="12" y1="18" x2="12.01" y2="18" />
                                                    </svg>
                                                }
                                                label="Mobile"
                                                value={user.mobile}
                                                href={`tel:${user.mobile}`}
                                            />
                                        )}
                                        {user.bio && (
                                            <InfoCard
                                                icon={
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <line x1="12" y1="16" x2="12" y2="12" />
                                                        <line x1="12" y1="8" x2="12.01" y2="8" />
                                                    </svg>
                                                }
                                                label="Bio"
                                                value={user.bio}
                                                multiline
                                            />
                                        )}
                                    </div>

                                    {/* Preview Shared Files */}
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="m-0 text-[11px] font-bold text-[#1368EC] uppercase tracking-wider">
                                                Shared Files
                                            </p>
                                            {validSharedFiles.length > 6 && (
                                                <button
                                                    onClick={() => setShowAllFiles(true)}
                                                    className="bg-slate-100 hover:bg-slate-200 border-none text-[#1368EC] text-[11px] font-bold cursor-pointer py-1 px-2.5 rounded-lg transition-colors"
                                                >
                                                    Show all
                                                </button>
                                            )}
                                        </div>

                                        <SharedFilesTab
                                            loadingFiles={loadingFiles}
                                            validSharedFiles={validSharedFiles.slice(0, 6)}
                                            setPreviewFile={setPreviewFile}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Actions Dialog */}
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

            {/* Manage Group Add Members Modal */}
            {showAddMemberModal && (
                <AddMemberModal
                    allUsers={users}
                    currentParticipants={group?.participants || []}
                    onClose={() => setShowAddMemberModal(false)}
                    onAdd={handleAddMembers}
                    loading={saving}
                />
            )}

            {/* Unified portal-rendered media previewer */}
            {previewFile && (
                <MediaModal
                    src={getFullUrl(previewFile.mediaUrl)}
                    fileName={previewFile.fileName}
                    fileType={previewFile.fileType}
                    fileSize={previewFile.fileSize}
                    category={getFileCategory(previewFile.fileType, previewFile.fileName)}
                    onClose={() => setPreviewFile(null)}
                    onDownload={(e, url, name) => {
                        e.stopPropagation();
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = name || 'file';
                        a.click();
                    }}
                />
            )}
        </>
    );
};

export default ProfileInfoPanel;
