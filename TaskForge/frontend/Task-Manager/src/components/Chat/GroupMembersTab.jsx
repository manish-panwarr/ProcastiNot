import React from 'react';
import { getInitials } from '../../utils/helper';
import { getFullUrl } from './chatUtils';

/**
 * Tab displaying group members list, promote/demote admin controls, and add/remove options.
 */
const GroupMembersTab = ({
    group,
    currentUser,
    canManageGroup,
    isGroupCreator,
    saving,
    handlePromoteAdmin,
    handleDemoteAdmin,
    handleRemoveMember,
    setShowAddMemberModal,
}) => {
    return (
        <div className="p-3.5 px-4 font-sans">
            <div className="flex items-center justify-between mb-3 px-1">
                <p className="m-0 text-[11px] font-medium text-[#1368EC] uppercase tracking-wider">
                    {group.participants?.length || 0} Members
                </p>
                {canManageGroup && (
                    <button
                        onClick={() => setShowAddMemberModal(true)}
                        className="bg-gradient-to-r from-[#1368EC] to-[#2563eb] border-none rounded-lg p-1.5 px-3 color-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/10 hover:shadow-md hover:shadow-blue-500/20 text-white transition-all"
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

            <div className="flex flex-col gap-0.5">
                {group.participants?.map((member) => {
                    const memberId = member._id || member;
                    const memberObj =
                        typeof member === 'object'
                            ? member
                            : { _id: member, name: 'User' };
                    const memberIsAdmin = group.groupAdmins?.some(
                        (a) => (a._id || a) === memberId
                    );
                    const memberIsCreator =
                        (group.createdBy?._id || group.createdBy) === memberId;
                    const isCurrentUser = memberId === currentUser?._id;

                    return (
                        <div
                            key={memberId}
                            className="flex items-center gap-2.5 p-2.5 px-2 rounded-xl transition-colors hover:bg-slate-50"
                        >
                            <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#1368EC] to-[#3b82f6] flex items-center justify-center color-white font-medium text-xs shrink-0 overflow-hidden text-white">
                                {memberObj.profileImageUrl ? (
                                    <img
                                        src={getFullUrl(memberObj.profileImageUrl)}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    getInitials(memberObj.name)
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className="m-0 font-semibold text-xs text-slate-900 truncate">
                                        {memberObj.name || 'User'}
                                    </p>
                                    {memberIsCreator && (
                                        <span className="bg-amber-100 text-amber-800 text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0">
                                            Creator
                                        </span>
                                    )}
                                    {memberIsAdmin && !memberIsCreator && (
                                        <span className="bg-blue-50 text-[#1368EC] text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0">
                                            Admin
                                        </span>
                                    )}
                                </div>
                                <p className="m-0 text-[10px] text-slate-500 truncate">
                                    {memberObj.role || memberObj.department || ''}
                                </p>
                            </div>

                            {canManageGroup && !isCurrentUser && !memberIsCreator && (
                                <div className="flex gap-1 shrink-0">
                                    {!memberIsAdmin ? (
                                        <button
                                            onClick={() => handlePromoteAdmin(memberId)}
                                            disabled={saving}
                                            title="Promote to Admin"
                                            className="bg-blue-50 border-none rounded-lg p-1.5 px-2 cursor-pointer text-[#1368EC] text-[10px] font-bold flex items-center gap-1 transition-colors hover:bg-blue-100 disabled:opacity-50"
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
                                            </svg>
                                            Admin
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleDemoteAdmin(memberId)}
                                            disabled={saving}
                                            title="Remove Admin"
                                            className="bg-amber-50 border-none rounded-lg p-1.5 px-2 cursor-pointer text-amber-800 text-[10px] font-bold flex items-center gap-1 transition-colors hover:bg-amber-100 disabled:opacity-50"
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
                                            </svg>
                                            Admin
                                        </button>
                                    )}
                                    {isGroupCreator && (
                                        <button
                                            onClick={() => handleRemoveMember(memberId)}
                                            disabled={saving}
                                            title="Remove Member"
                                            className="bg-red-50 hover:bg-red-100 border-none rounded-lg p-1.5 px-2 cursor-pointer text-red-500 text-[10px] font-bold flex items-center justify-center transition-colors disabled:opacity-50"
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
        </div>
    );
};

export default GroupMembersTab;
