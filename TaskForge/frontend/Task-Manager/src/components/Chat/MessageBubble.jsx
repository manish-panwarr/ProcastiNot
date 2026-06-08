import React from 'react';
import FileBubble from './FileBubble';
import MessageTicks from './MessageTicks';
import { getInitials } from '../../utils/helper';
import { getFileCategory, getFullUrl } from './chatUtils';


//@desc  : Individual chat bubble supporting sender metadata, file attachments, ticks,
//@params : msg, index, currentUser, isGroup, handleContextMenu, allConvImages, msgImageIndexMap
//@return : jsx
const MessageBubble = ({
    msg,
    index,
    currentUser,
    isGroup,
    handleContextMenu,
    allConvImages,
    msgImageIndexMap,
}) => {
    const senderId = msg.sender?._id || msg.sender;
    const isMe = senderId === currentUser?._id;

    // Deleted-for-everyone tombstone state
    if (msg._isDeletedForEveryone) {
        return (
            <div
                key={msg._id || index}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
                <div className="px-3.5 py-2 rounded-2xl bg-slate-100/80 text-slate-400 text-xs italic border border-slate-200/50 backdrop-blur-xs flex items-center gap-1.5">
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
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    This message was deleted
                </div>
            </div>
        );
    }

    const hasFT = !!msg.fileTransfer?.fileName;
    const hasImg = !!(msg.image && !msg.fileTransfer);
    const isMediaOnly = (hasFT || hasImg) && !msg.text;
    const ftCat = hasFT ? getFileCategory(msg.fileTransfer.fileType, msg.fileTransfer.fileName) : null;
    const isVisualMedia = isMediaOnly && (ftCat === 'image' || ftCat === 'video' || hasImg);

    return (
        <div
            key={msg._id || index}
            onContextMenu={(e) => handleContextMenu(e, msg)}
            className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
        >
            {/* Participant avatar (shown for incoming messages) */}
            {!isMe && (
                <div className="w-7.5 h-7.5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden shadow-xs">
                    {msg.sender?.profileImageUrl ? (
                        <img
                            src={getFullUrl(msg.sender.profileImageUrl)}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        getInitials(msg.sender?.name || '?')
                    )}
                </div>
            )}

            <div className="max-w-[68%]">
                {/* Sender display name for group messages */}
                {isGroup && !isMe && (
                    <p className="m-0 mb-1 ml-1 text-[10px] font-bold text-violet-600">
                        {msg.sender?.name || 'Unknown'}
                    </p>
                )}

                <div
                    className={`relative text-sm leading-relaxed cursor-context-menu animate-[msBubbleIn_0.22s_cubic-bezier(.34,1.4,.64,1)] ${isMediaOnly ? 'p-1' : 'px-3.5 py-2.5'
                        } ${isMe
                            ? 'rounded-2xl rounded-br-xs text-white'
                            : 'rounded-2xl rounded-bl-xs text-slate-800'
                        } ${isVisualMedia
                            ? isMe
                                ? 'bg-blue-500/10 border border-blue-500/25 shadow-md shadow-blue-500/5 backdrop-blur-md'
                                : 'bg-white/10 border border-white/25 shadow-md shadow-black/5 backdrop-blur-md'
                            : isMe
                                ? 'bg-gradient-to-br from-[#1368EC] to-[#1d4ed8] shadow-sm shadow-blue-600/20'
                                : 'bg-white/95 border border-[#e8eef8] shadow-xs'
                        }`}
                >
                    {/* Media File Attachment bubble */}
                    {hasFT && (
                        <div className={msg.text ? 'mb-2' : ''}>
                            <FileBubble
                                fileTransfer={msg.fileTransfer}
                                isMe={isMe}
                                isP2P={!!msg.isP2P}
                                allImages={ftCat === 'image' ? allConvImages : undefined}
                                imageIndex={ftCat === 'image' ? (msgImageIndexMap[msg._id || index] ?? -1) : 0}
                            />
                        </div>
                    )}

                    {/* Legacy direct image field */}
                    {hasImg && (
                        <div className={msg.text ? 'mb-2' : ''}>
                            <FileBubble
                                fileTransfer={{ fileName: 'image.jpg', fileType: 'image/jpeg', mediaUrl: msg.image }}
                                isMe={isMe}
                                isP2P={!!msg.isP2P}
                                allImages={allConvImages}
                                imageIndex={msgImageIndexMap[msg._id || index] ?? -1}
                            />
                        </div>
                    )}

                    {msg.text && (
                        <p className="m-0 whitespace-pre-wrap break-words">{msg.text}</p>
                    )}

                    {msg.isP2P && (
                        <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[8px] px-1 py-0.5 rounded font-extrabold shadow-sm select-none">
                            P2P
                        </div>
                    )}

                    {/* Message Timestamp & delivery ticks */}
                    <div
                        className={`flex items-center justify-end gap-1 mt-1 ${isMediaOnly
                                ? 'absolute bottom-2 right-2.5 bg-black/45 rounded-lg px-1.5 py-0.5 backdrop-blur-xs'
                                : ''
                            }`}
                    >
                        <span className={`text-[9px] ${isMediaOnly
                                ? 'text-white font-medium'
                                : isMe
                                    ? 'text-white/70'
                                    : 'text-slate-400'
                            }`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                            {msg.isEdited && ' • edited'}
                        </span>
                        <MessageTicks status={msg.status || 'sent'} isMe={isMe} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
