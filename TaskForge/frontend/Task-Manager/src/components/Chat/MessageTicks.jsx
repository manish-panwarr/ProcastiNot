import React from 'react';


const MessageTicks = ({ status, isMe }) => {
    if (!isMe) return null;

    const tickStyle = { display: 'inline-block', marginLeft: '4px', verticalAlign: 'middle', flexShrink: 0 };

    if (status === 'sending') {
        return (
            <svg width="12" height="12" viewBox="0 0 24 24" style={{ ...tickStyle, animation: 'spin 2s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5"
                    strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" fill="none" />
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </svg>
        );
    }

    if (status === 'seen') {
        return (
            <svg width="16" height="11" viewBox="0 0 16 11" style={tickStyle}>
                <path d="M1 6l3 3L11 1" stroke="#93c5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M5 6l3 3L15 1" stroke="#93c5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
        );
    }

    if (status === 'delivered') {
        return (
            <svg width="16" height="11" viewBox="0 0 16 11" style={tickStyle}>
                <path d="M1 6l3 3L11 1" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M5 6l3 3L15 1" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
        );
    }

    // Default: single tick (sent)
    return (
        <svg width="10" height="9" viewBox="0 0 10 9" style={tickStyle}>
            <path d="M1 5l3 3L9 1" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    );
};

export default MessageTicks;
