import React, { useEffect, useState } from 'react';

const TOAST_CONFIG = {
    success: {
        bg: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
        border: 'rgba(34,197,94,0.3)',
        accent: '#22c55e',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    },
    error: {
        bg: 'linear-gradient(135deg, #1c0a0a 0%, #450a0a 100%)',
        border: 'rgba(239,68,68,0.3)',
        accent: '#ef4444',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    },
    info: {
        bg: 'linear-gradient(135deg, #0a1628 0%, #0c2a55 100%)',
        border: 'rgba(59,130,246,0.3)',
        accent: '#3b82f6',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#3b82f6" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
        )
    },
    warning: {
        bg: 'linear-gradient(135deg, #1c1300 0%, #3d2700 100%)',
        border: 'rgba(245,158,11,0.3)',
        accent: '#f59e0b',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    }
};

const Toast = ({ message, type = 'info', onClose, duration = 3500 }) => {
    const [visible, setVisible] = useState(true);
    const cfg = TOAST_CONFIG[type] || TOAST_CONFIG.info;

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 350);
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '11px 16px',
            borderRadius: '12px',
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)`,
            backdropFilter: 'blur(12px)',
            color: '#f1f5f9',
            fontSize: '13px',
            fontWeight: '500',
            fontFamily: "'Poppins', sans-serif",
            letterSpacing: '0.01em',
            maxWidth: '380px',
            minWidth: '220px',
            opacity: visible ? 1 : 0,
            transform: `translateY(${visible ? '0' : '-8px'})`,
            transition: 'opacity 0.35s ease, transform 0.35s ease',
            pointerEvents: 'auto',
        }}>

            <div style={{
                width: '3px', height: '28px', borderRadius: '2px',
                background: cfg.accent, flexShrink: 0
            }} />


            <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: `rgba(255,255,255,0.07)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                border: `1px solid ${cfg.border}`
            }}>
                {cfg.icon}
            </div>

            {/* Message */}
            <span style={{ flex: 1, lineHeight: '1.5' }}>{message}</span>

            {/* Close */}
            <button
                onClick={() => { setVisible(false); setTimeout(onClose, 350); }}
                style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer', color: 'rgba(241,245,249,0.6)',
                    borderRadius: '6px', width: '22px', height: '22px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: '12px', padding: 0,
                    transition: 'all 0.15s'
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(241,245,249,0.6)'; }}
            >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
            </button>
        </div>
    );
};

export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'info', duration = 3500) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const ToastContainer = () => (
        <div style={{
            position: 'fixed', top: '20px', right: '20px',
            zIndex: 99999, display: 'flex',
            flexDirection: 'column', gap: '8px',
            pointerEvents: 'none',
            fontFamily: "'Poppins', sans-serif"
        }}>
            {toasts.map(t => (
                <Toast
                    key={t.id}
                    message={t.message}
                    type={t.type}
                    duration={t.duration}
                    onClose={() => removeToast(t.id)}
                />
            ))}
        </div>
    );

    return { addToast, ToastContainer };
};

export default Toast;
