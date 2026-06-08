import React, { useState } from 'react';
import { getInitials } from '../../utils/helper';
import InfoCard from './InfoCard';
import { getFullUrl } from './chatUtils';

//@desc : group info tab
//@params : group, currentUser, canManageGroup, isGroupCreator, isGroupAdmin, currentAdminCount, messagingMode, saving, handleUpdateGroup, handleToggleMessagingMode, handleDeleteGroup
//@return : jsx
const GroupInfoTab = ({
    group,
    currentUser,
    canManageGroup,
    isGroupCreator,
    isGroupAdmin,
    currentAdminCount,
    messagingMode,
    saving,
    handleUpdateGroup,
    handleToggleMessagingMode,
    handleDeleteGroup,
}) => {
    const [isEditingName, setIsEditingName] = useState(false);

    return (
        <div className="p-5 font-sans">
            {/* Header: Group avatar, name and member count */}
            <div className="text-center mb-5 relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-4xl text-white mx-auto mb-3 shadow-md shadow-violet-500/20 relative overflow-hidden group">
                    {group.groupAvatar ? (
                        <img
                            src={getFullUrl(group.groupAvatar)}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        getInitials(group.groupName)
                    )}

                    {canManageGroup && (
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                            <label className="cursor-pointer color-white text-[10px] flex flex-col items-center">
                                <span className="flex mb-1">
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
                                    className="hidden"
                                    onChange={async (e) => {
                                        if (e.target.files?.[0]) {
                                            const formData = new FormData();
                                            formData.append('groupAvatar', e.target.files[0]);
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
                                    className="mt-1 bg-red-500 text-white border-none rounded px-1.5 py-0.5 text-[9px] cursor-pointer"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {canManageGroup ? (
                    <div className="flex items-center justify-center gap-2">
                        {isEditingName ? (
                            <div className="flex gap-1">
                                <input
                                    autoFocus
                                    defaultValue={group.groupName}
                                    onBlur={() => setIsEditingName(false)}
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                            const val = e.target.value.trim();
                                            if (val && val !== group.groupName) {
                                                await handleUpdateGroup({ groupName: val });
                                            }
                                            setIsEditingName(false);
                                        } else if (e.key === 'Escape') {
                                            setIsEditingName(false);
                                        }
                                    }}
                                    className="px-2 py-1 rounded-md border border-[#1368EC] outline-none text-base font-extrabold text-center w-40 font-sans"
                                />
                            </div>
                        ) : (
                            <h2 className="m-0 mb-1 text-lg font-semibold text-slate-900 flex items-center gap-1.5 justify-center">
                                {group.groupName}
                                <button
                                    onClick={() => setIsEditingName(true)}
                                    className="border-none background-none cursor-pointer text-slate-400 p-0 flex hover:text-[#1368EC] transition-colors"
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
                    <h2 className="m-0 mb-1 text-lg font-semibold text-slate-900">
                        {group.groupName}
                    </h2>
                )}

                <p className="m-0 text-xs text-slate-500 font-medium">
                    {group.participants?.length || 0} members
                </p>
            </div>

            {/* Info Cards */}
            <div className="flex flex-col gap-3">
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
                    value={group.createdBy?.name || 'Unknown'}
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
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                    }
                    label="Created"
                    value={new Date(group.createdAt).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                    })}
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

            {/* Settings & Admin Controls */}
            {canManageGroup && (
                <div className="mt-5 p-4 bg-slate-50 rounded-2xl border border-[#e8eef8]">
                    <p className="m-0 mb-3 text-[11px] font-bold text-[#1368EC] uppercase tracking-wider">
                        Group Settings
                    </p>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="m-0 font-semibold text-xs text-slate-900">
                                Messaging Mode
                            </p>
                            <p className="m-0 mt-0.5 text-[11px] text-slate-500">
                                {messagingMode === 'everyone'
                                    ? 'Everyone can send messages'
                                    : 'Only admins can send messages'}
                            </p>
                        </div>
                        <div
                            onClick={!saving ? handleToggleMessagingMode : undefined}
                            className={`w-11 h-6 rounded-full relative cursor-pointer shrink-0 transition-colors duration-300 ${messagingMode === 'everyone' ? 'bg-[#22c55e]' : 'bg-slate-400'
                                } ${saving ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                            <div
                                className={`absolute top-[3px] w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-all duration-300 ${messagingMode === 'everyone' ? 'left-[22px]' : 'left-[3px]'
                                    }`}
                            />
                        </div>
                    </div>

                    {(isGroupCreator || isGroupAdmin) && (
                        <button
                            onClick={handleDeleteGroup}
                            disabled={saving}
                            className="mt-4 w-full p-2.5 rounded-xl border-none bg-red-100 hover:bg-red-200 text-red-600 font-semibold text-xs cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    );
};

export default GroupInfoTab;
