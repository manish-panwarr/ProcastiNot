import React from 'react';


//@desc : reusable card component to display details like name, department, role, or meta stats.
//@params : icon, label, value, href, multiline
//@return : jsx
const InfoCard = ({ icon, label, value, href, multiline }) => (
    <div
        className={`flex gap-2.5 p-2.5 px-3 bg-slate-50 rounded-xl border border-[#e8eef8] ${multiline ? 'items-start' : 'items-center'
            }`}
    >
        <span className={`shrink-0 flex text-slate-500 ${multiline ? 'mt-0.5' : ''}`}>
            {icon}
        </span>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 m-0 uppercase font-bold tracking-wider mb-0.5">
                {label}
            </p>
            {href ? (
                <a
                    href={href}
                    className="text-xs text-[#1368EC] font-semibold block truncate no-underline hover:underline"
                >
                    {value}
                </a>
            ) : (
                <p
                    className={`text-xs text-slate-900 m-0 font-medium leading-relaxed ${multiline ? 'whitespace-pre-wrap' : 'truncate'
                        }`}
                >
                    {value}
                </p>
            )}
        </div>
    </div>
);

export default InfoCard;
