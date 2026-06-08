import React from 'react';
import { getFileCategory, FILE_META, formatSize } from './chatUtils';


const MessageInput = ({
    newMessage,
    onChange,
    onKeyDown,
    files = [],
    removeFile,
    canSendMessage,
    canSend,
    sending,
    useP2P,
    fileInputRef,
    textareaRef,
    handleFileSelect,
    handleSend,
    editingMessage,
    onCancelEdit,
    isExpanded,
    onToggleExpand,
}) => {
    return (
        <form
            onSubmit={handleSend}
            className="bg-transparent border-t border-[#e8eef8] p-3 px-4 shrink-0 rounded-b-2xl"
        >
            {/* Admin-only warning banner */}
            {!canSendMessage && (
                <div className="p-2 px-3.5 bg-amber-50 border border-amber-200 rounded-xl mb-2.5 text-xs text-amber-800 font-semibold flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Only group admins can send messages here
                </div>
            )}

            {/* Editing Message Banner */}
            {editingMessage && (
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl mb-2.5 text-xs text-blue-800 animate-[msBubbleIn_0.22s_cubic-bezier(.34,1.4,.64,1)]">
                    <div className="flex items-center gap-2 font-semibold min-w-0">
                        <span className="text-sm shrink-0"></span>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold">Editing Message</span>
                            <span className="text-slate-600 font-normal truncate max-w-[280px] sm:max-w-[450px]">
                                {editingMessage.text}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none cursor-pointer text-sm p-1 ml-2 shrink-0"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Staged attachment file preview strip */}
            {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2.5 p-2.5 bg-slate-50 border border-[#e8eef8] rounded-xl">
                    {files.map((file, i) => {
                        const cat = getFileCategory(file.type, file.name);
                        const fm = FILE_META[cat] || FILE_META.other;
                        return (
                            <div
                                key={i}
                                title={file.name}
                                className="relative rounded-lg border flex items-center gap-1.5 p-1.5 pr-2.5 max-w-[160px]"
                                style={{ borderColor: fm.border, background: fm.bg }}
                            >
                                <div
                                    className="w-8 h-8 rounded-md overflow-hidden shrink-0 flex items-center justify-center text-white font-black text-[9px]"
                                    style={{ background: fm.color }}
                                >
                                    {cat === 'image' ? (
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        file.name.split('.').pop().toUpperCase().slice(0, 4)
                                    )}
                                </div>
                                <div className="overflow-hidden flex-1 min-w-0">
                                    <p className="m-0 text-[10px] font-bold text-slate-800 truncate">
                                        {file.name}
                                    </p>
                                    <p className="m-0 text-[9px] font-semibold" style={{ color: fm.color }}>
                                        {formatSize(file.size)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeFile(i)}
                                    className="absolute -top-1 -right-1 bg-slate-900 text-white border-none rounded-full w-4 h-4 cursor-pointer text-[8px] flex items-center justify-center p-0"
                                >
                                    ✕
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Compose tools wrapper */}
            <div className="flex gap-1 items-end">
                <button
                    type="button"
                    onClick={() => canSendMessage && !editingMessage && fileInputRef.current?.click()}
                    disabled={!canSendMessage || !!editingMessage}
                    className={`bg-transparent border-none p-2.5 rounded-xl text-slate-500 transition-colors shrink-0 ${canSendMessage && !editingMessage
                        ? 'cursor-pointer hover:bg-[#e8eef8] hover:text-[#1368EC]'
                        : 'cursor-not-allowed opacity-50'
                        }`}
                >
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                />

                {/* Text composer textarea */}
                <textarea
                    ref={textareaRef}
                    className="flex-1 p-2.5 px-4 border border-[#e8eef8] focus:border-[#1368EC] focus:bg-white rounded-2xl text-sm outline-none text-slate-800 bg-[#fafbff] resize-y min-h-[42px] max-h-[300px] font-sans leading-normal overflow-y-auto scrollbar-thin transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder={!canSendMessage ? 'Messaging restricted...' : editingMessage ? 'Edit message...' : 'Type a message...'}
                    value={newMessage}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    rows={1}
                    disabled={!canSendMessage}
                />

                {/* Expand / Collapse Toggle button */}
                {canSendMessage && (
                    <button
                        type="button"
                        onClick={onToggleExpand}
                        className="bg-transparent border-none p-2.5 rounded-xl text-slate-500 hover:bg-[#e8eef8] hover:text-[#1368EC] transition-colors shrink-0 cursor-pointer"
                        title={isExpanded ? "Collapse input" : "Expand input"}
                    >
                        {isExpanded ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                            </svg>
                        )}
                    </button>
                )}

                {/* Send action button */}
                <button
                    type="submit"
                    disabled={!canSend}
                    className={`border-none rounded-full w-10.5 h-10.5 flex items-center justify-center shrink-0 transition-all ${canSend
                        ? 'bg-gradient-to-br from-[#1368EC] to-[#2563eb] text-white cursor-pointer shadow-md shadow-blue-500/20 hover:shadow-lg'
                        : 'bg-[#e8eef8] text-slate-400 cursor-not-allowed'
                        }`}
                >
                    {sending ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : useP2P ? (
                        <svg className="w-4.5 h-4.5 text-current" viewBox="0 0 24 24" fill="none">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    ) : (
                        <svg className="w-4.5 h-4.5 text-current" viewBox="0 0 24 24" fill="none">
                            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </button>
            </div>
        </form>
    );
};

export default MessageInput;
