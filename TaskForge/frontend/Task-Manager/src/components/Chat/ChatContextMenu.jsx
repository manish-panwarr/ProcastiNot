import React, { useEffect, useRef } from 'react';

const ChatContextMenu = ({ x, y, isMe, isAdmin, canEdit, onEdit, onDeleteForMe, onDeleteForEveryone, onDeleteFromDB, onClose }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('contextmenu', onClose);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('contextmenu', onClose);
        };
    }, [onClose]);

    // Keep the menu within the viewport bounds.
    const safeX = Math.min(x, window.innerWidth - 200);
    const safeY = Math.min(y, window.innerHeight - 200);

    const MenuItem = ({ label, icon, onClick, danger = false }) => (
        <div
            onClick={() => { onClick(); onClose(); }}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-md cursor-pointer text-[13px] font-medium transition-colors duration-100 ${danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100'}`}
        >
            <span className="text-[15px]">{icon}</span>
            {label}
        </div>
    );

    return (
        <div
            ref={menuRef}
            className="fixed z-[10001] bg-white rounded-xl shadow-xl border border-gray-200 p-1.5 min-w-[190px]"
            style={{ left: safeX, top: safeY, animation: 'ctxMenuIn 0.15s ease' }}
        >
            {canEdit && (
                <MenuItem label="Edit Message" icon=">" onClick={onEdit} />
            )}
            <MenuItem label="Delete for Me" icon=">" onClick={onDeleteForMe} />
            {(isMe || isAdmin) && (
                <MenuItem label="Delete for Everyone" icon=">" onClick={onDeleteForEveryone} danger />
            )}
            {isAdmin && (
                <MenuItem label="Delete from DB" icon=">" onClick={onDeleteFromDB} danger />
            )}
        </div>
    );
};

export default ChatContextMenu;
