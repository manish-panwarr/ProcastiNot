import React, { useState, useEffect, useRef } from 'react';
import { GrGroup } from 'react-icons/gr';
import { getInitials } from '../../utils/helper';
import { getFullUrl } from './chatUtils';


const ChatHeader = ({
    selectedUser,
    selectedGroup,
    currentUser,
    onOpenProfile,
    onBack,
    useP2P,
    setUseP2P,
    socket,
    addToast,
    isTargetOnline,
    handleDeleteAllChats,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);
    const isGroup = !!selectedGroup;

    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleP2P = (checked) => {
        if (checked) {
            if (socket && selectedUser) {
                socket.emit('request_p2p', {
                    recipientId: selectedUser._id,
                    senderId: currentUser._id,
                    senderName: currentUser.name,
                });
                addToast('P2P request sent… waiting for response', 'info');
            }
        } else {
            setUseP2P(false);
            if (socket && selectedUser) {
                socket.emit('cancel_p2p', { recipientId: selectedUser._id });
            }
        }
    };

    return (
        <div className="p-3.5 px-4 bg-white border-b border-[#e8eef8] flex justify-between items-center shadow-xs shrink-0 select-none font-sans">
            {/* Left: Avatar + Details */}
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                    <button
                        onClick={onOpenProfile}
                        title="View profile"
                        className="bg-transparent border-none cursor-pointer p-0 flex items-center"
                    >
                        <div className={`w-10.5 h-10.5 rounded-2xl flex items-center justify-center font-bold text-sm text-white overflow-hidden shadow-xs ${isGroup
                                ? 'bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl'
                                : 'bg-gradient-to-br from-[#1368EC] to-[#3b82f6] rounded-full'
                            }`}>
                            {isGroup ? (
                                selectedGroup.groupAvatar ? (
                                    <img
                                        src={getFullUrl(selectedGroup.groupAvatar)}
                                        className="w-full h-full object-cover"
                                        alt=""
                                    />
                                ) : (
                                    <GrGroup />
                                )
                            ) : selectedUser.profileImageUrl ? (
                                <img
                                    src={getFullUrl(selectedUser.profileImageUrl)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                getInitials(selectedUser.name)
                            )}
                        </div>
                    </button>

                    {/* Back button*/}
                    {onBack && (
                        <button
                            onClick={onBack}
                            title="Back"
                            className="absolute -top-1.5 -left-2.5 w-5 h-5 rounded-full bg-[#1368EC] hover:bg-[#0f52c4] border-2 border-white shadow-md flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                        >
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="m-0 font-semibold text-sm text-slate-800 truncate max-w-[160px] tracking-tight">
                            {isGroup ? selectedGroup.groupName : selectedUser.name}
                        </p>
                        {/* Private Peer-to-Peer encrypted toggle */}
                        {!isGroup && (
                            <label className={`flex items-center gap-1 cursor-pointer text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${useP2P
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm shadow-emerald-500/10'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={useP2P}
                                    onChange={(e) => toggleP2P(e.target.checked)}
                                    className="hidden"
                                />
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {useP2P ? 'Private' : 'Secure'}
                            </label>
                        )}
                    </div>
                    <p className={`text-[11px] font-medium m-0 mt-0.5 flex items-center gap-1.5 ${isGroup ? 'text-violet-600' : isTargetOnline ? 'text-emerald-500' : 'text-slate-400'
                        }`}>
                        {isGroup ? (
                            <>
                                <span>{selectedGroup.participants?.length || 0} members</span>
                                <span>·</span>
                                <span>{selectedGroup.messagingMode === 'admin_only' ? '🔒 Admins only' : 'Everyone'}</span>
                            </>
                        ) : (
                            isTargetOnline ? (
                                <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_0_2px_rgba(16,185,129,0.25)]" />
                                    Online
                                </>
                            ) : (
                                <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                                    Offline
                                </>
                            )
                        )}
                    </p>
                </div>
            </div>

            {/* Right: Three-dot options menu */}
            <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu((prev) => !prev)}
                        title="More options"
                        className="border border-[#e8eef8] hover:border-slate-300 bg-white hover:bg-slate-50 rounded-xl p-2 cursor-pointer text-slate-700 flex items-center justify-center transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-[110%] bg-white rounded-xl shadow-lg border border-[#e8eef8] z-[1000] min-w-[165px] p-1.5 animate-[msCtxIn_0.15s_ease]">
                            <div
                                onClick={() => {
                                    handleDeleteAllChats();
                                    setShowMenu(false);
                                }}
                                className="p-2.5 cursor-pointer text-red-500 hover:bg-red-50 text-[13px] rounded-lg font-semibold flex items-center gap-2 transition-colors"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Delete Chat
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatHeader;
