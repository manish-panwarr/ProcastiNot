import React from 'react';
import { getFullUrl, getFileCategory, FILE_META } from './chatUtils';

const FileTypeIcon = ({ category }) => {
    switch (category) {
        case 'pdf':
            return (
                <svg className="w-6 h-6 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
            );
        case 'word':
            return (
                <svg className="w-6 h-6 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
            );
        case 'excel':
            return (
                <svg className="w-6 h-6 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
            );
        case 'archive':
            return (
                <svg className="w-6 h-6 text-purple-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="12" x2="12" y2="18" />
                    <line x1="10" y1="15" x2="14" y2="15" />
                </svg>
            );
        case 'audio':
            return (
                <svg className="w-6 h-6 text-pink-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="15.5" r="2.5" />
                </svg>
            );
        case 'video':
            return (
                <svg className="w-6 h-6 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                    <line x1="7" y1="2" x2="7" y2="22" />
                    <line x1="17" y1="2" x2="17" y2="22" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <line x1="2" y1="7" x2="7" y2="7" />
                    <line x1="2" y1="17" x2="7" y2="17" />
                    <line x1="17" y1="17" x2="22" y2="17" />
                    <line x1="17" y1="7" x2="22" y2="7" />
                </svg>
            );
        default:
            return (
                <svg className="w-6 h-6 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                </svg>
            );
    }
};

//@desc : tab displaying a grid gallery of all media/documents shared in the active conversation.
//@params : 
const SharedFilesTab = ({ loadingFiles, validSharedFiles = [], setPreviewFile }) => {
    return (
        <div className="p-3.5 px-4 font-sans">
            <p className="m-0 mb-3 text-[11px] font-bold text-[#1368EC] uppercase tracking-wider">
                Shared Files
            </p>
            {loadingFiles ? (
                <p className="text-xs text-slate-400 text-center py-5">
                    Loading...
                </p>
            ) : validSharedFiles.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                    <div className="flex justify-center mb-2">
                        <svg
                            className="w-9 h-9"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <p className="text-xs m-0 font-medium">No shared files yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2.5">
                    {validSharedFiles.map((msg, i) => {
                        const ft = msg.fileTransfer || {};
                        const cat = getFileCategory(ft.fileType, ft.fileName);
                        const isImg = cat === 'image';
                        const src = isImg ? getFullUrl(ft.mediaUrl) : null;
                        const ext = ft.fileName ? ft.fileName.split('.').pop().toUpperCase() : 'FILE';

                        return (
                            <div
                                key={i}
                                onClick={() => setPreviewFile(ft)}
                                title={ft.fileName}
                                className="aspect-square rounded-xl bg-slate-50 border border-[#e8eef8] flex flex-col items-center justify-center cursor-pointer overflow-hidden relative transition-all duration-150 hover:shadow-sm hover:scale-95"
                            >
                                {isImg ? (
                                    <img
                                        src={src}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <>
                                        <span className="flex items-center justify-center my-1">
                                            <FileTypeIcon category={cat} />
                                        </span>
                                        <span className="text-[9px] text-slate-500 mt-1 truncate w-full text-center px-1 font-bold">
                                            {ext.slice(0, 4)}
                                        </span>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SharedFilesTab;
export { FileTypeIcon };
