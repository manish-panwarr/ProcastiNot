import React from 'react';

//@desc : Modal confirmation dialog with a backdrop overlay.

const ConfirmDialog = ({
    title = 'Are you sure?',
    body,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    confirmStyle = 'danger',
}) => {
    const isDanger = confirmStyle === 'danger';

    return (
        <div
            onClick={onCancel}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 backdrop-blur-xs p-4"
        >
            {/* Dialog card */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl w-[90%] max-w-[400px] p-7 px-8 shadow-2xl animate-[dialogSlideIn_0.2s_ease]"
            >
                <h3 className="text-lg font-bold text-slate-900 mb-3 mt-0 tracking-tight">{title}</h3>
                {body && <p className="text-sm text-slate-500 leading-relaxed mb-6 mt-0">{body}</p>}

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm cursor-pointer transition-colors hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-5 py-2.5 rounded-xl border-none text-white font-semibold text-sm cursor-pointer transition-all hover:shadow-md ${isDanger
                            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/10'
                            : 'bg-[#1368EC] hover:bg-[#0f52c4] shadow-blue-500/10'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes dialogSlideIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default ConfirmDialog;
