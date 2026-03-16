import React, { useEffect, useRef } from 'react';

const ChatContextMenu = ({ x, y, isMe, onDeleteForMe, onDeleteForEveryone, onClose }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('contextmenu', onClose);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('contextmenu', onClose);
        };
    }, [onClose]);

    const adjustedX = Math.min(x, window.innerWidth - 200);
    const adjustedY = Math.min(y, window.innerHeight - 120);

    const menuItem = (label, icon, onClick, danger = false) => (
        <div
            onClick={() => { onClick(); onClose(); }}
            style={{
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: '13px',
                color: danger ? '#ef4444' : '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderRadius: '6px',
                transition: 'background 0.12s',
                fontWeight: '500'
            }}
            onMouseOver={e => e.currentTarget.style.background = danger ? '#fee2e2' : '#f3f4f6'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
        >
            <span style={{ fontSize: '15px' }}>{icon}</span>
            {label}
        </div>
    );

    return (
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                left: adjustedX,
                top: adjustedY,
                zIndex: 10001,
                background: '#fff',
                borderRadius: '10px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                border: '1px solid #e5e7eb',
                padding: '6px',
                minWidth: '190px',
                animation: 'ctxMenuIn 0.15s ease',
            }}
        >
            {menuItem('Delete for Me', onDeleteForMe, false)}
            {isMe && menuItem('Delete for Everyone', onDeleteForEveryone, true)}
            <style>{`
                @keyframes ctxMenuIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default ChatContextMenu;
