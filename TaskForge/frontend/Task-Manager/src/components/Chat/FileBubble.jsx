import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import MediaModal from './MediaModal';
import { getFileCategory, FILE_META, formatSize } from './chatUtils';
import { BASE_URL } from '../../utils/apiPaths';

/** Resolve a media URL that may be relative or absolute. */
const resolveUrl = (mediaUrl) => {
    if (!mediaUrl) return null;
    if (mediaUrl.startsWith('http') || mediaUrl.startsWith('data:') || mediaUrl.startsWith('blob:')) {
        return mediaUrl;
    }
    return `${BASE_URL}${mediaUrl}`;
};

/** Shared download handler for all file types. */
const downloadFile = async (url, name, onStart, onEnd, onError) => {
    if (!url) return;
    onStart();
    try {
        if (url.startsWith('data:')) {
            const a = document.createElement('a');
            a.href = url;
            a.download = name || 'file';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        }
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = name || 'file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    } catch (err) {
        console.error('Download failed:', err);
        onError(url);
    } finally {
        onEnd();
    }
};

// Spinner SVG used in download buttons.
const SpinnerIcon = ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'msSpin 1s linear infinite' }}>
        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2.5" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
);

// Download arrow SVG.
const DownloadIcon = ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/**
 * Renders a file attachment bubble appropriate to the file type:
 *   - image  → thumbnail with hover overlay and gallery support
 *   - video  → thumbnail with play button
 *   - audio  → compact player card
 *   - other  → document card with type label and download button
 *
 * Opens a MediaModal portal on click.
 */
const FileBubble = ({ fileTransfer, isMe, isP2P = false, allImages, imageIndex = 0 }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(imageIndex);
    const [isHovered, setIsHovered] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const { fileName, fileSize, fileType, mediaUrl } = fileTransfer || {};
    const category = getFileCategory(fileType, fileName);
    const meta = FILE_META[category] || FILE_META.other;
    const src = resolveUrl(mediaUrl);

    const handleDownload = async (e, url, name) => {
        e.stopPropagation();
        if (!url || downloading) return;
        await downloadFile(
            url,
            name,
            () => setDownloading(true),
            () => setDownloading(false),
            (fallbackUrl) => window.open(fallbackUrl, '_blank', 'noreferrer')
        );
    };

    const handleNavigate = (dir) => {
        if (!allImages) return;
        const next = activeIdx + dir;
        if (next >= 0 && next < allImages.length) setActiveIdx(next);
    };

    const activeImage = (allImages && allImages[activeIdx]) || { src, fileName, fileSize };

    // Portal-rendered full-screen modal.
    const modal = isModalOpen && src
        ? ReactDOM.createPortal(
            <MediaModal
                src={activeImage.src}
                fileName={activeImage.fileName}
                fileType={fileType}
                fileSize={activeImage.fileSize}
                category={category}
                meta={meta}
                onClose={() => { setIsModalOpen(false); setActiveIdx(imageIndex); }}
                onDownload={handleDownload}
                downloading={downloading}
                allImages={allImages}
                imageIndex={activeIdx}
                onNavigate={handleNavigate}
            />,
            document.body
        )
        : null;

    //  Image 
    if (category === 'image') {
        if (!src) {
            return (
                <div style={{ width: '220px', height: '140px', borderRadius: '12px', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>Image unavailable</span>
                </div>
            );
        }
        return (
            <>
                <div
                    onClick={() => setIsModalOpen(true)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{ cursor: 'zoom-in', borderRadius: '12px', overflow: 'hidden', maxWidth: '280px', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', position: 'relative' }}
                >
                    <img
                        src={src} alt={fileName}
                        style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block', transition: 'transform 0.2s ease' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    {/* Hover expand overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isHovered ? 1 : 0, transition: 'opacity 0.18s ease' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(255,255,255,0.4)' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                    {/* Download button (visible on hover) */}
                    <button
                        onClick={(e) => handleDownload(e, src, fileName || 'image')}
                        title={downloading ? 'Downloading…' : 'Download'}
                        style={{ position: 'absolute', bottom: '8px', right: '8px', width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', border: 'none', cursor: downloading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isHovered ? 1 : 0, transition: 'opacity 0.18s ease', zIndex: 2, padding: 0 }}
                    >
                        {downloading ? <SpinnerIcon /> : <DownloadIcon />}
                    </button>
                </div>
                {modal}
            </>
        );
    }

    //  Video 
    if (category === 'video') {
        if (!src) {
            return <div style={{ padding: '10px 14px', background: isMe ? 'rgba(255,255,255,0.12)' : '#f3f4f6', borderRadius: '10px', fontSize: '13px' }}>🎞 Video unavailable</div>;
        }
        return (
            <>
                <div
                    onClick={() => setIsModalOpen(true)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{ cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', maxWidth: '300px', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', position: 'relative', background: '#000' }}
                >
                    <video src={src} style={{ width: '100%', display: 'block', maxHeight: '220px', background: '#000', pointerEvents: 'none' }} preload="metadata" muted />
                    <div style={{ position: 'absolute', inset: 0, background: isHovered ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.18s ease' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: isHovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', transform: isHovered ? 'scale(1.08)' : 'scale(1)', transition: 'all 0.18s ease' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginLeft: '3px' }}>
                                <polygon points="5,3 19,12 5,21" fill="#1368EC" />
                            </svg>
                        </div>
                    </div>
                    <button
                        onClick={(e) => handleDownload(e, src, fileName || 'video')}
                        title={downloading ? 'Downloading…' : 'Download'}
                        style={{ position: 'absolute', bottom: '8px', right: '8px', width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', border: 'none', cursor: downloading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isHovered ? 1 : 0, transition: 'opacity 0.18s ease', zIndex: 2, padding: 0 }}
                    >
                        {downloading ? <SpinnerIcon /> : <DownloadIcon />}
                    </button>
                </div>
                {modal}
            </>
        );
    }

    //  Audio 
    if (category === 'audio') {
        return (
            <>
                <div
                    onClick={() => src && setIsModalOpen(true)}
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 14px', background: isMe ? 'rgba(255,255,255,0.12)' : '#fdf2f8', border: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : '#fbcfe8'}`, borderRadius: '14px', minWidth: '220px', cursor: src ? 'pointer' : 'default' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#db2777,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(219,39,119,0.4)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" /></svg>
                        </div>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: '600', fontSize: '13px', color: isMe ? '#fff' : '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</p>
                            <p style={{ margin: 0, fontSize: '11px', color: isMe ? 'rgba(255,255,255,0.6)' : '#9ca3af' }}>{formatSize(fileSize)}</p>
                        </div>
                        {src && (
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isMe ? 'rgba(255,255,255,0.25)' : '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ marginLeft: '2px' }}>
                                    <polygon points="5,3 19,12 5,21" fill="white" />
                                </svg>
                            </div>
                        )}
                    </div>
                </div>
                {modal}
            </>
        );
    }

    //  Other (PDF, DOCX, ZIP, …) 
    const ext = fileName ? fileName.split('.').pop().toUpperCase() : meta.label;
    return (
        <>
            <div
                onClick={() => src && setIsModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: isMe ? 'rgba(255,255,255,0.12)' : meta.bg, border: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : meta.border}`, borderRadius: '14px', minWidth: '200px', maxWidth: '280px', cursor: 'pointer', transition: 'transform 0.12s ease, box-shadow 0.12s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: meta.color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.5" />
                        <path d="M14 2v6h6" stroke="white" strokeWidth="1.5" />
                    </svg>
                    <span style={{ fontSize: '7px', fontWeight: '800' }}>{ext.slice(0, 4)}</span>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ margin: '0 0 3px', fontWeight: '700', fontSize: '13px', color: isMe ? '#fff' : '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName || 'File'}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: isMe ? 'rgba(255,255,255,0.6)' : '#6b7280' }}>{formatSize(fileSize)} · {ext}</p>
                </div>
                <button
                    onClick={(e) => handleDownload(e, src, fileName)}
                    title={downloading ? 'Downloading…' : 'Download file'}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: downloading ? 'wait' : 'pointer', flexShrink: 0, padding: 0, opacity: downloading ? 0.7 : 1, transition: 'opacity 0.15s' }}
                >
                    {downloading ? <SpinnerIcon size={14} /> : <DownloadIcon size={14} />}
                </button>
            </div>
            {modal}
        </>
    );
};

export default FileBubble;
