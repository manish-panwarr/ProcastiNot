import React from 'react';

const ConfirmDialog = ({
    title = 'Are you sure?',
    body,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    confirmStyle = 'danger'
}) => {
    const confirmColor = confirmStyle === 'danger' ? '#ef4444' : '#1368EC';

    return (
        <>

            <div
                onClick={onCancel}
                style={{
                    position: 'fixed', inset: 0, zIndex: 10000,
                    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >

                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: '#fff',
                        borderRadius: '16px',
                        padding: '28px 32px',
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                        animation: 'dialogSlideIn 0.2s ease'
                    }}
                >
                    <h3 style={{ margin: '0 0 12px', fontSize: '17px', color: '#111', fontWeight: '700' }}>
                        {title}
                    </h3>
                    {body && (
                        <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                            {body}
                        </p>
                    )}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={onCancel}
                            style={{
                                padding: '10px 20px', borderRadius: '8px',
                                border: '1px solid #e5e7eb', background: '#fff',
                                color: '#374151', cursor: 'pointer', fontWeight: '600',
                                fontSize: '14px', transition: 'background 0.15s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#f9fafb'}
                            onMouseOut={e => e.currentTarget.style.background = '#fff'}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            style={{
                                padding: '10px 20px', borderRadius: '8px',
                                border: 'none', background: confirmColor,
                                color: '#fff', cursor: 'pointer', fontWeight: '600',
                                fontSize: '14px', transition: 'opacity 0.15s'
                            }}
                            onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                            onMouseOut={e => e.currentTarget.style.opacity = '1'}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes dialogSlideIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </>
    );
};

export default ConfirmDialog;
