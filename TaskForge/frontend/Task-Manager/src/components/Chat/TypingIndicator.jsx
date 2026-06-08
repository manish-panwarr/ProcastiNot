import React from 'react';

//@desc : typing indicator for  chat
const TypingIndicator = ({ count = 1 }) => {
    if (count === 0) return null;

    return (
        <div className="flex justify-start items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white/90 rounded-2xl shadow-sm border border-[#e8eef8]">
                <div className="flex gap-[3px] mr-1">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="w-1 h-1 rounded-full bg-[#1368EC]"
                            style={{ animation: `msTypingDot 1.2s ${i * 0.2}s infinite` }}
                        />
                    ))}
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">
                    {count === 1 ? 'typing...' : `${count} people are typing...`}
                </span>
            </div>
        </div>
    );
};

export default TypingIndicator;
