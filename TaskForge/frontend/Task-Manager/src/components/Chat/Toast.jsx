import React, { useEffect, useState } from 'react';


// Toast visual configuration
const TOAST_CONFIG = {
    success: {
        bg: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
        border: 'rgba(34,197,94,0.3)',
        accent: '#22c55e',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    error: {
        bg: 'linear-gradient(135deg, #1c0a0a 0%, #450a0a 100%)',
        border: 'rgba(239,68,68,0.3)',
        accent: '#ef4444',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
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
        ),
    },
    warning: {
        bg: 'linear-gradient(135deg, #1c1300 0%, #3d2700 100%)',
        border: 'rgba(245,158,11,0.3)',
        accent: '#f59e0b',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
};


// Single Toast item

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

    const dismiss = () => {
        setVisible(false);
        setTimeout(onClose, 350);
    };

    return (
        <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-md text-slate-100 text-xs font-medium tracking-wide max-w-[380px] min-w-[220px] transition-all duration-350 pointer-events-auto shadow-2xl ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                }`}
            style={{
                background: cfg.bg,
                borderColor: cfg.border,
            }}
        >
            {/* Coloured left accent bar */}
            <div
                className="w-0.5 h-7 rounded-sm shrink-0"
                style={{ background: cfg.accent }}
            />

            {/* Icon wrapper */}
            <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                style={{ background: 'rgba(255,255,255,0.07)', borderColor: cfg.border }}
            >
                {cfg.icon}
            </div>

            {/* Message text */}
            <span className="flex-1 leading-relaxed">{message}</span>

            {/* Dismiss button */}
            <button
                onClick={dismiss}
                className="bg-white/8 border border-white/10 hover:bg-white/15 hover:text-white cursor-pointer text-slate-100/60 rounded-md w-5.5 h-5.5 flex items-center justify-center shrink-0 text-xs p-0 transition-all"
            >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
            </button>
        </div>
    );
};


// ToastContainer
const ToastContainer = ({ toasts, onRemove }) => (
    <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
            <Toast
                key={t.id}
                message={t.message}
                type={t.type}
                duration={t.duration}
                onClose={() => onRemove(t.id)}
            />
        ))}
    </div>
);


// useToast hook
export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'info', duration = 3500) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const BoundToastContainer = () => (
        <ToastContainer toasts={toasts} onRemove={removeToast} />
    );

    return { addToast, ToastContainer: BoundToastContainer };
};

export default Toast;
