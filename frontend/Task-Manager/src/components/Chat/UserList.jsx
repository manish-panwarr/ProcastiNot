import React, { useState, useMemo, useContext } from 'react';
import { getInitials } from '../../utils/helper';
import axiosInstance from '../../utils/axiosInstance';
import { BASE_URL } from '../../utils/apiPaths';

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

const truncate = (str, n = 30) => {
    if (!str) return '';
    return str.length > n ? str.slice(0, n) + '…' : str;
};

const Avatar = ({ name, imageUrl, size = 44, online = false, isGroup = false }) => {
    const finalUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`) : null;

    return (
        <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
                width: size, height: size, borderRadius: isGroup ? '14px' : '50%',
                background: isGroup ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'linear-gradient(135deg, #1368EC, #3b82f6)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: size * 0.35, overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
            }}>
                {finalUrl
                    ? <img src={finalUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitials(name)
                }
            </div>
            {online && !isGroup && (
                <div style={{
                    position: 'absolute', bottom: 1, right: 1,
                    width: 11, height: 11, borderRadius: '50%',
                    background: '#22c55e', border: '2px solid #fff'
                }} />
            )}
        </div>
    );
};

const ConvRow = React.memo(({ item, isGroup, isOnline, isSelected, onSelect, unreadCount, lastText, lastTime }) => (
    <div
        onClick={onSelect}
        style={{
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', cursor: 'pointer',
            background: isSelected
                ? 'linear-gradient(135deg, #eff6ff, #e0ecff)'
                : 'transparent',
            borderRadius: '12px',
            margin: '2px 8px',
            transition: 'all 0.15s ease',
            gap: '12px'
        }}
        onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = '#f5f7ff'; }}
        onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
        <Avatar
            name={isGroup ? item.groupName : item.name}
            imageUrl={isGroup ? item.groupAvatar : item.profileImageUrl}
            isGroup={isGroup}
            online={isOnline}
        />
        <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                <p style={{
                    fontWeight: unreadCount > 0 ? '500' : '600',
                    fontSize: '13px', color: '#0f172a', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px',

                }}>
                    {isGroup ? item.groupName : item.name}
                </p>
                <span style={{ fontSize: '10px', color: '#94a3b8', flexShrink: 0 }}>{formatTime(lastTime)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{
                    fontSize: '12px',
                    color: unreadCount > 0 ? '#1368EC' : '#64748b', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px',
                    fontWeight: unreadCount > 0 ? '600' : 'normal'
                }}>
                    {lastText || (isGroup ? `${item.participants?.length || 0} members` : (item.department || 'No Department'))}
                </p>
                {unreadCount > 0 && (
                    <span style={{
                        background: 'linear-gradient(135deg, #1368EC, #2563eb)',
                        color: '#fff', borderRadius: '20px',
                        minWidth: '18px', height: '18px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: '700', flexShrink: 0, padding: '0 5px'
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </div>
        </div>
    </div>
));

const CreateGroupModal = ({ users, onClose, onCreated }) => {
    const [groupName, setGroupName] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

    const toggleUser = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleCreate = async () => {
        if (!groupName.trim() || selectedIds.length === 0) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('groupName', groupName.trim());
            // We stringify the array because FormData values are strings (or blobs)
            // The backend must parse this string back to an array
            formData.append('memberIds', JSON.stringify(selectedIds));
            if (imageFile) {
                formData.append('groupAvatar', imageFile);
            }

            const res = await axiosInstance.post('/api/chat/group/create', formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            onCreated(res.data);
            onClose();
        } catch (err) {
            console.error('Group creation failed', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(0,0,0,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: '#fff', borderRadius: '20px', width: '420px',
                maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
                animation: 'cgmSlideUp 0.3s cubic-bezier(0.4,0,0.2,1)'
            }}>
                <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>
                            Create Group
                        </h3>
                        <button onClick={onClose} style={{
                            background: '#f1f5f9', border: 'none', borderRadius: '50%',
                            width: '32px', height: '32px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', color: '#64748b'
                        }}>✕</button>
                    </div>
                    <input
                        type="text"
                        placeholder="Group name..."
                        value={groupName}
                        onChange={e => setGroupName(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 14px', borderRadius: '12px',
                            border: '2px solid #e2e8f0', fontSize: '14px', outline: 'none',
                            boxSizing: 'border-box', fontFamily: 'inherit', color: '#0f172a',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={e => e.target.style.borderColor = '#1368EC'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                </div>

                <div style={{ padding: '0 24px 16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <label style={{
                        width: '50px', height: '50px', borderRadius: '14px',
                        background: '#f1f5f9', border: '1px dashed #cbd5e1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', overflow: 'hidden'
                    }}>
                        {previewUrl ? (
                            <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ display: 'flex', color: '#94a3b8' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                    <circle cx="12" cy="13" r="4"></circle>
                                </svg>
                            </span>
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
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        Add Group Icon (Optional)
                    </p>
                </div>

                <div style={{ padding: '12px 24px 8px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: '700', color: '#1368EC', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        Add Members ({selectedIds.length} selected)
                    </p>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: '8px 12px', borderRadius: '10px',
                            border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none',
                            boxSizing: 'border-box', fontFamily: 'inherit', background: '#f8fafc', color: '#0f172a'
                        }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px' }}>
                    {filtered.map(user => {
                        const sel = selectedIds.includes(user._id);
                        return (
                            <div
                                key={user._id}
                                onClick={() => toggleUser(user._id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '8px 8px', borderRadius: '10px', cursor: 'pointer',
                                    background: sel ? '#eff6ff' : 'transparent',
                                    transition: 'background 0.15s', margin: '2px 0'
                                }}
                                onMouseOver={e => { if (!sel) e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseOut={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <div style={{
                                    width: '20px', height: '20px', borderRadius: '6px',
                                    border: `2px solid ${sel ? '#1368EC' : '#cbd5e1'}`,
                                    background: sel ? '#1368EC' : '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, transition: 'all 0.15s'
                                }}>
                                    {sel && <span style={{ color: '#fff', fontSize: '12px', lineHeight: 1 }}>✓</span>}
                                </div>
                                <Avatar name={user.name} imageUrl={user.profileImageUrl} size={36} />
                                <div>
                                    <p style={{ margin: 0, fontWeight: '600', fontSize: '13px', color: '#0f172a' }}>{user.name}</p>
                                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{user.role || user.department || ''}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                        onClick={handleCreate}
                        disabled={!groupName.trim() || selectedIds.length === 0 || loading}
                        style={{
                            width: '100%', padding: '9px',
                            background: (!groupName.trim() || selectedIds.length === 0 || loading)
                                ? '#e2e8f0'
                                : 'linear-gradient(135deg, #1368EC, #2563eb)',
                            color: (!groupName.trim() || selectedIds.length === 0 || loading) ? '#94a3b8' : '#fff',
                            border: 'none', borderRadius: '12px', fontSize: '14px',
                            fontWeight: '500', cursor: (!groupName.trim() || selectedIds.length === 0 || loading) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s', fontFamily: 'inherit'
                        }}
                    >
                        {loading ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes cgmSlideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

const UserList = ({ users, onlineUsers, onSelectUser, onSelectGroup, selectedUser, selectedGroup, conversations = [], unreadCounts = {}, currentUser, onGroupCreated }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('All');
    const [activeTab, setActiveTab] = useState('chats');
    const [showCreateGroup, setShowCreateGroup] = useState(false);

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
    const departments = ['All', ...new Set(users.map(u => u.department).filter(Boolean))];

    const dmConversations = conversations.filter(c => !c.isGroup);
    const groupConversations = conversations.filter(c => c.isGroup);

    const getLastMsgTime = (userId) => {
        const conv = dmConversations.find(c => c.participants?.some(p => (p._id || p) === userId));
        return new Date(conv?.lastMessageAt || conv?.updatedAt || 0).getTime();
    };

    const filtered = useMemo(() => users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedDept === 'All' || u.department === selectedDept)
    ), [users, searchTerm, selectedDept]);

    const online = filtered.filter(u => onlineUsers.includes(u._id?.toString())).sort((a, b) => getLastMsgTime(b._id) - getLastMsgTime(a._id));
    const offline = filtered.filter(u => !onlineUsers.includes(u._id?.toString())).sort((a, b) => getLastMsgTime(b._id) - getLastMsgTime(a._id));

    const filteredGroups = groupConversations.filter(g =>
        (g.groupName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getLastTextForUser = (userId) => {
        const conv = dmConversations.find(c => c.participants?.some(p => (p._id || p) === userId));
        const lastMsg = conv?.lastMessage;
        return lastMsg ? (lastMsg.text ? truncate(lastMsg.text, 24) : lastMsg.fileTransfer ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg> File
            </span>
        ) : '') : null;
    };

    const getLastTextForGroup = (group) => {
        const lastMsg = group.lastMessage;
        return lastMsg ? (lastMsg.text ? truncate(lastMsg.text, 24) : lastMsg.fileTransfer ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg> File
            </span>
        ) : '') : null;
    };

    const handleGroupCreated = (group) => {
        onGroupCreated();
        onSelectGroup(group);
    };

    return (
        <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            background: '#fafbff', borderRight: '1px solid #e8eef8'
        }}>
            <div style={{ padding: '18px 16px 12px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '500', fontFamily: 'inherit', color: '#0f172a', letterSpacing: '-0.3px' }}>
                        Messages
                    </h2>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {isAdmin && (
                            <button
                                onClick={() => setShowCreateGroup(true)}
                                title="Create Group"
                                style={{
                                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                    border: 'none', borderRadius: '10px', padding: '7px 10px',
                                    cursor: 'pointer', color: '#fff', fontSize: '14px',
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    boxShadow: '0 2px 8px rgba(124,58,237,0.35)'
                                }}
                            >
                                <svg width="16" height="14" viewBox="0 0 24 24" fill="none">
                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                    <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2" />
                                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M20 10v6M17 13h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                Group
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ position: 'relative', marginBottom: '8px', display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <svg
                            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                            width="16" height="16" viewBox="0 0 24 24" fill="none"
                        >
                            <circle cx="11" cy="11" r="8" stroke="#94a3b8" strokeWidth="2" />
                            <path d="M21 21l-4.35-4.35" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', padding: '9px 12px 9px 36px',
                                border: '2px solid #e8eef8', borderRadius: '12px',
                                fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                                color: '#0f172a', background: '#fff', fontFamily: 'inherit',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#1368EC'}
                            onBlur={e => e.target.style.borderColor = '#e8eef8'}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px', fontFamily: 'inherit' }}>
                    {['chats', 'groups'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                flex: 1, padding: '7px', border: 'none', cursor: 'pointer',
                                borderRadius: '8px', fontSize: '12px', fontWeight: '500',
                                fontFamily: 'inherit', transition: 'all 0.2s',
                                background: activeTab === tab ? '#fff' : 'transparent',
                                color: activeTab === tab ? '#1368EC' : '#64748b',
                                boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                textTransform: 'capitalize'
                            }}
                        >
                            {tab === 'chats' ? 'Chats' : 'Groups'}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>
                {activeTab === 'chats' ? (
                    <>
                        {online.length === 0 && offline.length === 0 && (
                            <p style={{ padding: '20px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>No users found</p>
                        )}
                        {online.length > 0 && (
                            <>
                                <div style={{ padding: '6px 22px 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Online</span>
                                    <span style={{ fontSize: '12px', background: '#dcfce7', color: '#16a34a', borderRadius: '10px', padding: '1px 7px', fontWeight: '500' }}>{online.length}</span>
                                </div>
                                {online.map(user => (
                                    <ConvRow
                                        key={user._id}
                                        item={user}
                                        isGroup={false}
                                        isOnline={true}
                                        isSelected={selectedUser?._id === user._id}
                                        onSelect={() => {
                                            const conv = dmConversations.find(c => c.participants?.some(p => (p._id || p) === user._id));
                                            onSelectUser(user, conv?._id);
                                        }}
                                        unreadCount={unreadCounts?.[user._id] || 0}
                                        lastText={getLastTextForUser(user._id)}
                                        lastTime={(() => { const c = dmConversations.find(c => c.participants?.some(p => (p._id || p) === user._id)); return c?.lastMessageAt || c?.updatedAt; })()}
                                    />
                                ))}
                            </>
                        )}
                        {offline.length > 0 && (
                            <>
                                <div style={{ padding: '6px 22px 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Offline</span>
                                    <span style={{ fontSize: '12px', background: '#f1f5f9', color: '#94a3b8', borderRadius: '10px', padding: '1px 7px', fontWeight: '500' }}>{offline.length}</span>
                                </div>
                                {offline.map(user => (
                                    <ConvRow
                                        key={user._id}
                                        item={user}
                                        isGroup={false}
                                        isOnline={false}
                                        isSelected={selectedUser?._id === user._id}
                                        onSelect={() => {
                                            const conv = dmConversations.find(c => c.participants?.some(p => (p._id || p) === user._id));
                                            onSelectUser(user, conv?._id);
                                        }}
                                        unreadCount={unreadCounts?.[user._id] || 0}
                                        lastText={getLastTextForUser(user._id)}
                                        lastTime={(() => { const c = dmConversations.find(c => c.participants?.some(p => (p._id || p) === user._id)); return c?.lastMessageAt || c?.updatedAt; })()}
                                    />
                                ))}
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {filteredGroups.length === 0
                            ? <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                </div>
                                <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>No groups yet</p>
                                {isAdmin && <p style={{ fontSize: '12px', marginTop: '6px' }}>Create a group to get started</p>}
                            </div>
                            : filteredGroups.map(group => (
                                <ConvRow
                                    key={group._id}
                                    item={group}
                                    isGroup={true}
                                    isOnline={false}
                                    isSelected={selectedGroup?._id === group._id}
                                    onSelect={() => onSelectGroup(group)}
                                    unreadCount={unreadCounts?.[group._id] || 0}
                                    lastText={getLastTextForGroup(group)}
                                    lastTime={group.lastMessageAt || group.updatedAt}
                                />
                            ))
                        }
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
