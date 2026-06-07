import React, { useState, useMemo } from 'react';
import { getInitials } from '../../utils/helper';
import axiosInstance from '../../utils/axiosInstance';
import { truncateText, formatTime } from './chatUtils';
import { BASE_URL } from '../../utils/apiPaths';

// Resolve image URL
const resolveUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${BASE_URL}${url}`;
};

// Clip icon for file attachment indicator in preview
const AttachmentIcon = () => (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
);


// Avatar Component
const Avatar = ({ name, imageUrl, size = 44, online = false, isGroup = false }) => {
    const src = resolveUrl(imageUrl);
    return (
        <div className="relative shrink-0">
            <div
                style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}
                className={`flex items-center justify-center font-bold text-white overflow-hidden shadow-xs ${isGroup
                    ? 'bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl'
                    : 'bg-gradient-to-br from-[#1368EC] to-[#3b82f6] rounded-full'
                    }`}
            >
                {src ? (
                    <img src={src} alt={name} className="w-full h-full object-cover" />
                ) : (
                    getInitials(name)
                )}
            </div>
            {online && !isGroup && (
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            )}
        </div>
    );
};


// ConvRow Component
const ConvRow = React.memo(({ item, isGroup, isOnline, isSelected, onSelect, unreadCount, lastText, lastTime }) => {
    const displayName = isGroup ? item.groupName : item.name;
    const imageUrl = isGroup ? item.groupAvatar : item.profileImageUrl;
    const hasUnread = unreadCount > 0;

    const nameFontWeight = hasUnread ? 'font-bold' : 'font-medium';
    const previewColor = hasUnread ? 'text-[#1368EC]' : 'text-slate-500';
    const previewWeight = hasUnread ? 'font-semibold' : 'font-normal';

    const fallbackPreview = isGroup
        ? `${item.participants?.length || 0} members`
        : (item.department || 'No Department');

    return (
        <div
            onClick={onSelect}
            className={`p-2.5 px-3.5 flex items-center cursor-pointer rounded-xl m-0.5 mx-2 transition-colors gap-3 ${isSelected
                ? 'bg-gradient-to-r from-blue-50 to-blue-100/50'
                : 'hover:bg-slate-50 bg-transparent'
                }`}
        >
            <Avatar name={displayName} imageUrl={imageUrl} isGroup={isGroup} online={isOnline} />

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-xs text-slate-800 m-0 truncate max-w-[140px] tracking-tight ${nameFontWeight}`}>
                        {displayName}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">{formatTime(lastTime)}</span>
                </div>

                <div className="flex items-center justify-between">
                    <div className={`text-xs m-0 truncate max-w-[150px] flex items-center gap-1 ${previewColor} ${previewWeight}`}>
                        {lastText || fallbackPreview}
                    </div>
                    {hasUnread && (
                        <span className="bg-gradient-to-r from-[#1368EC] to-[#2563eb] text-white rounded-full min-w-4.5 h-4.5 flex items-center justify-center text-[9px] font-bold shrink-0 px-1 shadow-sm shadow-blue-500/20">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
});

// ---------------------------------------------------------------------------
// CreateGroupModal Component
// ---------------------------------------------------------------------------
const CreateGroupModal = ({ users, onClose, onCreated }) => {
    const [groupName, setGroupName] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const filteredUsers = useMemo(
        () => users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase())),
        [users, search]
    );

    const toggleUser = (id) => {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };

    const handleCreate = async () => {
        if (!groupName.trim() || selectedIds.length === 0) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('groupName', groupName.trim());
            formData.append('memberIds', JSON.stringify(selectedIds));
            if (imageFile) formData.append('groupAvatar', imageFile);

            const res = await axiosInstance.post('/api/chat/group/create', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onCreated(res.data);
            onClose();
        } catch (err) {
            console.error('Group creation failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const isSubmitDisabled = !groupName.trim() || selectedIds.length === 0 || loading;

    return (
        <div className="fixed inset-0 z-[9000] bg-black/40 flex items-center justify-center backdrop-blur-xs p-5">
            <div className="bg-white rounded-3xl w-full max-w-[420px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-[cgmSlideUp_0.3s_cubic-bezier(0.4,0,0.2,1)]">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="m-0 text-lg font-bold text-slate-800">Create Group</h3>
                        <button
                            onClick={onClose}
                            className="bg-slate-100 hover:bg-slate-200 border-none rounded-full w-8 h-8 cursor-pointer flex items-center justify-center text-sm text-slate-500 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Group name..."
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full p-2.5 px-3.5 rounded-xl border-2 border-slate-100 focus:border-[#1368EC] text-sm outline-none box-border font-sans text-slate-800 transition-all bg-slate-50 focus:bg-white"
                    />
                </div>

                {/* Avatar upload */}
                <div className="p-3 px-6 flex items-center gap-4">
                    <label className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 border border-dashed border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden shrink-0 transition-colors">
                        {previewUrl ? (
                            <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        )}
                        <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setImageFile(file);
                                    setPreviewUrl(URL.createObjectURL(file));
                                }
                            }}
                        />
                    </label>
                    <p className="m-0 text-xs text-slate-500 font-medium">Add Group Icon (Optional)</p>
                </div>

                {/* Member search */}
                <div className="p-2 px-6">
                    <p className="m-0 mb-2 text-[10px] font-bold text-[#1368EC] uppercase tracking-wider">
                        Add Members ({selectedIds.length} selected)
                    </p>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full p-2 px-3 rounded-xl border border-slate-200 text-xs outline-none box-border font-sans bg-slate-50 text-slate-800 focus:border-[#1368EC] focus:bg-white transition-all"
                    />
                </div>

                {/* Member selection list */}
                <div className="flex-1 overflow-y-auto p-4 px-5">
                    {filteredUsers.map((user) => {
                        const selected = selectedIds.includes(user._id);
                        return (
                            <div
                                key={user._id}
                                onClick={() => toggleUser(user._id)}
                                className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors m-0.5 ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'border-[#1368EC] bg-[#1368EC]' : 'border-slate-300 bg-white'
                                    }`}>
                                    {selected && <span className="text-white text-[11px] font-bold">✓</span>}
                                </div>
                                <Avatar name={user.name} imageUrl={user.profileImageUrl} size={36} />
                                <div className="flex-1 min-w-0">
                                    <p className="m-0 font-semibold text-xs text-slate-800 truncate">{user.name}</p>
                                    <p className="m-0 text-[10px] text-slate-500 truncate">{user.role || user.department || ''}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 px-6 border-t border-slate-100">
                    <button
                        onClick={handleCreate}
                        disabled={isSubmitDisabled}
                        className={`w-full py-2.5 border-none rounded-xl text-sm font-semibold transition-all shadow-sm ${isSubmitDisabled
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-[#1368EC] to-[#2563eb] text-white cursor-pointer hover:shadow-md'
                            }`}
                    >
                        {loading ? 'Creating…' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main UserList Component
// ---------------------------------------------------------------------------
const UserList = ({
    users,
    onlineUsers,
    onSelectUser,
    onSelectGroup,
    selectedUser,
    selectedGroup,
    conversations = [],
    unreadCounts = {},
    currentUser,
    onGroupCreated,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('chats');
    const [showCreateGroup, setShowCreateGroup] = useState(false);

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    const dmConversations = useMemo(() => conversations.filter((c) => !c.isGroup), [conversations]);
    const groupConversations = useMemo(() => conversations.filter((c) => c.isGroup), [conversations]);

    const getLastMsgTime = (userId) => {
        const conv = dmConversations.find((c) => c.participants?.some((p) => (p._id || p) === userId));
        return new Date(conv?.lastMessageAt || conv?.updatedAt || 0).getTime();
    };

    const filteredUsers = useMemo(() =>
        users.filter((u) => u.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [users, searchTerm]
    );

    const onlineList = useMemo(() =>
        filteredUsers
            .filter((u) => onlineUsers.includes(u._id?.toString()))
            .sort((a, b) => getLastMsgTime(b._id) - getLastMsgTime(a._id)),
        [filteredUsers, onlineUsers, dmConversations]
    );

    const offlineList = useMemo(() =>
        filteredUsers
            .filter((u) => !onlineUsers.includes(u._id?.toString()))
            .sort((a, b) => getLastMsgTime(b._id) - getLastMsgTime(a._id)),
        [filteredUsers, onlineUsers, dmConversations]
    );

    const filteredGroups = useMemo(() =>
        groupConversations.filter((g) =>
            (g.groupName || '').toLowerCase().includes(searchTerm.toLowerCase())
        ),
        [groupConversations, searchTerm]
    );

    // Get preview label for direct message row
    const getDmLastText = (userId) => {
        const conv = dmConversations.find((c) => c.participants?.some((p) => (p._id || p) === userId));
        const lastMsg = conv?.lastMessage;
        if (!lastMsg) return null;
        if (lastMsg.text) return truncateText(lastMsg.text, 24);
        if (lastMsg.fileTransfer) return <span className="flex items-center gap-1"><AttachmentIcon /> File</span>;
        return '';
    };

    // Get preview label for group row
    const getGroupLastText = (group) => {
        const lastMsg = group.lastMessage;
        if (!lastMsg) return null;
        if (lastMsg.text) return truncateText(lastMsg.text, 24);
        if (lastMsg.fileTransfer) return <span className="flex items-center gap-1"><AttachmentIcon /> File</span>;
        return '';
    };

    const getDmLastTime = (userId) => {
        const conv = dmConversations.find((c) => c.participants?.some((p) => (p._id || p) === userId));
        return conv?.lastMessageAt || conv?.updatedAt;
    };

    const handleGroupCreated = (group) => {
        onGroupCreated();
        onSelectGroup(group);
    };

    const handleSelectUser = (user) => {
        const conv = dmConversations.find((c) => c.participants?.some((p) => (p._id || p) === user._id));
        onSelectUser(user, conv?._id);
    };

    const renderSection = (label, colorClass, count, badgeClass) => (
        <div className="p-1 px-5.5 pt-2.5 flex items-center gap-1.5 select-none">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${colorClass}`}>
                {label}
            </span>
            <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${badgeClass}`}>
                {count}
            </span>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col bg-[#fafbff] border-r border-[#e8eef8] font-sans">
            {/* Header */}
            <div className="p-4 px-4.5 pb-2 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="m-0 text-lg font-bold text-slate-800 tracking-tight">Messages</h2>
                    {isAdmin && (
                        <button
                            onClick={() => setShowCreateGroup(true)}
                            title="Create Group"
                            className="bg-gradient-to-br from-violet-600 to-indigo-700 border-none rounded-xl p-1.5 px-3.5 cursor-pointer text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-violet-500/20 hover:shadow-lg transition-all"
                        >
                            <svg width="15" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                                <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2.5" />
                                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                                <path d="M20 10v6M17 13h6" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                            Group
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="relative mb-2.5">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2.5" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl border-2 border-[#e8eef8] focus:border-[#1368EC] focus:bg-white text-xs outline-none box-border font-sans text-slate-800 transition-all bg-slate-50"
                    />
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-slate-100 rounded-xl p-1 shrink-0">
                    {['chats', 'groups'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-1.5 border-none cursor-pointer rounded-lg text-xs font-bold transition-all capitalize font-sans ${activeTab === tab
                                ? 'bg-white text-[#1368EC] shadow-xs'
                                : 'bg-transparent text-slate-500'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Conversation list area */}
            <div className="flex-1 overflow-y-auto pb-2">
                {activeTab === 'chats' ? (
                    <>
                        {onlineList.length === 0 && offlineList.length === 0 && (
                            <p className="p-5 text-slate-400 text-xs text-center font-medium">No users found</p>
                        )}
                        {onlineList.length > 0 && (
                            <>
                                {renderSection('Online', 'text-emerald-500', onlineList.length, 'bg-emerald-50 text-emerald-700')}
                                {onlineList.map((user) => (
                                    <ConvRow
                                        key={user._id}
                                        item={user}
                                        isGroup={false}
                                        isOnline
                                        isSelected={selectedUser?._id === user._id}
                                        onSelect={() => handleSelectUser(user)}
                                        unreadCount={unreadCounts[user._id] || 0}
                                        lastText={getDmLastText(user._id)}
                                        lastTime={getDmLastTime(user._id)}
                                    />
                                ))}
                            </>
                        )}
                        {offlineList.length > 0 && (
                            <>
                                {renderSection('Offline', 'text-slate-400', offlineList.length, 'bg-slate-100 text-slate-500')}
                                {offlineList.map((user) => (
                                    <ConvRow
                                        key={user._id}
                                        item={user}
                                        isGroup={false}
                                        isOnline={false}
                                        isSelected={selectedUser?._id === user._id}
                                        onSelect={() => handleSelectUser(user)}
                                        unreadCount={unreadCounts[user._id] || 0}
                                        lastText={getDmLastText(user._id)}
                                        lastTime={getDmLastTime(user._id)}
                                    />
                                ))}
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {filteredGroups.length === 0 ? (
                            <div className="text-center p-10 px-5 text-slate-400 select-none">
                                <div className="flex justify-center mb-2.5">
                                    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                </div>
                                <p className="text-xs font-bold m-0 text-slate-500">No groups yet</p>
                                {isAdmin && (
                                    <p className="text-[11px] mt-1.5">Create a group to get started</p>
                                )}
                            </div>
                        ) : (
                            filteredGroups.map((group) => (
                                <ConvRow
                                    key={group._id}
                                    item={group}
                                    isGroup
                                    isOnline={false}
                                    isSelected={selectedGroup?._id === group._id}
                                    onSelect={() => onSelectGroup(group)}
                                    unreadCount={unreadCounts[group._id] || 0}
                                    lastText={getGroupLastText(group)}
                                    lastTime={group.lastMessageAt || group.updatedAt}
                                />
                            ))
                        )}
                    </>
                )}
            </div>

            {showCreateGroup && (
                <CreateGroupModal
                    users={users}
                    onClose={() => setShowCreateGroup(false)}
                    onCreated={handleGroupCreated}
                />
            )}
        </div>
    );
};

export default UserList;
