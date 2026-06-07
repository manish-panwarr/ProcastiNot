import React, { useState } from 'react';
import { getInitials } from '../../utils/helper';
import { getFullUrl } from './chatUtils';

/**
 * Modal dialog to select and add users as new members to the current group.
 */
const AddMemberModal = ({ allUsers = [], currentParticipants = [], onClose, onAdd, loading }) => {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    const participantIds = currentParticipants.map((p) => (p._id || p).toString());
    const availableUsers = allUsers.filter((u) => !participantIds.includes(u._id.toString()));
    const filteredUsers = availableUsers.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase())
    );

    const toggleUser = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-black/45 flex items-center justify-center backdrop-blur-xs p-5">
            <div className="bg-white rounded-3xl w-full max-w-[400px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-[ammSlideUp_0.3s_cubic-bezier(0.4,0,0.2,1)]">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="m-0 text-lg font-bold text-slate-900 font-sans">
                            Add New Members
                        </h3>
                        <button
                            onClick={onClose}
                            className="bg-slate-100 hover:bg-slate-200 border-none rounded-full w-8 height-8 cursor-pointer flex items-center justify-center text-sm text-slate-500 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="relative">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-100 focus:border-[#1368EC] focus:bg-white text-sm outline-none box-border font-sans bg-slate-50 text-slate-900 transition-all"
                        />
                    </div>
                </div>

                {/* Member selection area */}
                <div className="flex-1 overflow-y-auto p-3 px-4">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-10 px-5 text-slate-400">
                            <p className="m-0 text-sm font-medium">
                                {search ? 'No users found' : 'All users are already in the group'}
                            </p>
                        </div>
                    ) : (
                        filteredUsers.map((u) => {
                            const isSelected = selectedIds.includes(u._id);
                            return (
                                <div
                                    key={u._id}
                                    onClick={() => toggleUser(u._id)}
                                    className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-colors m-0.5 ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                                        }`}
                                >
                                    <div
                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isSelected
                                                ? 'border-[#1368EC] bg-[#1368EC]'
                                                : 'border-slate-300 bg-white'
                                            }`}
                                    >
                                        {isSelected && (
                                            <span className="color-white text-[11px] font-extrabold">
                                                ✓
                                            </span>
                                        )}
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1368EC] to-[#3b82f6] text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                                        {u.profileImageUrl ? (
                                            <img
                                                src={getFullUrl(u.profileImageUrl)}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            getInitials(u.name)
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="m-0 font-semibold text-sm text-slate-900 truncate">
                                            {u.name}
                                        </p>
                                        <p className="m-0 text-[11px] text-slate-500 truncate">
                                            {u.role || u.department || 'Member'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer actions */}
                <div className="p-5 px-6 border-t border-slate-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 border-none rounded-xl text-sm font-semibold cursor-pointer transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onAdd(selectedIds)}
                        disabled={selectedIds.length === 0 || loading}
                        className={`flex-1 py-3 border-none rounded-xl text-sm font-semibold transition-all shadow-sm ${selectedIds.length === 0 || loading
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-[#1368EC] to-[#2563eb] text-white cursor-pointer hover:shadow-md hover:shadow-blue-500/20'
                            }`}
                    >
                        {loading
                            ? 'Adding...'
                            : `Add ${selectedIds.length > 0 ? selectedIds.length : ''} Members`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMemberModal;
