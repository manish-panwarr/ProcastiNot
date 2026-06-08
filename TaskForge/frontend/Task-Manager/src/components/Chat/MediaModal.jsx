import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatSize } from './chatUtils';

// Shared zoom control button style
const zoomBtnStyle = {
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'transparent', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s', padding: 0,
};


// Full-screen media viewer supporting:

const MediaModal = ({
    src, fileName, fileType, fileSize, category, meta,
    onClose, onDownload, downloading,
    allImages, imageIndex, onNavigate,
}) => {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const imgRef = useRef(null);

    // Reset view whenever the source image changes.
    useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [src]);

    // Keyboard shortcuts: Esc, arrow navigation, +/- zoom.
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') { onClose(); return; }
            if (category !== 'image') return;
            if (e.key === 'ArrowLeft') onNavigate?.(-1);
            if (e.key === 'ArrowRight') onNavigate?.(+1);
            if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 5));
            if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 0.2));
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose, onNavigate, category]);

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setZoom((z) => Math.min(Math.max(z + delta, 0.2), 5));
    };

    const handleMouseDown = (e) => {
        if (zoom <= 1 && pan.x === 0 && pan.y === 0) return;
        e.preventDefault();
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
        document.body.style.cursor = 'grabbing';
    };

    const handleMouseMove = useCallback((e) => {
        if (!isDragging.current) return;
        setPan({
            x: dragStart.current.panX + (e.clientX - dragStart.current.x),
            y: dragStart.current.panY + (e.clientY - dragStart.current.y),
        });
    }, []);

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
        document.body.style.cursor = '';
    }, []);

    useEffect(() => {
        if (category !== 'image') return;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [category, handleMouseMove, handleMouseUp]);

    const zoomIn = (e) => { e.stopPropagation(); setZoom((z) => Math.min(z + 0.25, 5)); };
    const zoomOut = (e) => { e.stopPropagation(); setZoom((z) => Math.max(z - 0.25, 0.2)); };
    const resetView = (e) => { e.stopPropagation(); setZoom(1); setPan({ x: 0, y: 0 }); };

    const hasNav = allImages && allImages.length > 1;
    const canNavigate = (dir) => {
        if (!hasNav) return false;
        const next = imageIndex + dir;
        return next >= 0 && next < allImages.length;
    };

    const currentItem = (hasNav && allImages[imageIndex]) || { src, fileName, fileSize };
    const ext = fileName ? fileName.split('.').pop().toUpperCase() : (meta?.label || 'File');

    const activeFileName = category === 'image' && hasNav ? currentItem.fileName : fileName;
    const activeFileSize = category === 'image' && hasNav ? currentItem.fileSize : fileSize;
    const activeSrc = category === 'image' && hasNav ? currentItem.src : src;

    const renderContent = () => {
        if (category === 'image') {
            return (
                <div
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 'calc(100vh - 120px)', overflow: 'hidden' }}
                    onWheel={handleWheel}
                >
                    <img
                        ref={imgRef}
                        src={currentItem.src}
                        alt={currentItem.fileName}
                        onMouseDown={handleMouseDown}
                        onDoubleClick={resetView}
                        draggable={false}
                        onError={(e) => { e.target.alt = 'Failed to load'; }}
                        style={{
                            maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain',
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transformOrigin: 'center center',
                            transition: isDragging.current ? 'none' : 'transform 0.15s ease',
                            cursor: zoom > 1 ? (isDragging.current ? 'grabbing' : 'grab') : 'default',
                            userSelect: 'none',
                            borderRadius: zoom <= 1 ? '14px' : '4px',
                            boxShadow: '0 32px 96px rgba(0,0,0,0.7)',
                            animation: 'msModalPop 0.22s cubic-bezier(.34,1.56,.64,1)',
                        }}
                    />

                    {/* Previous image button */}
                    {hasNav && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onNavigate?.(-1); }}
                            disabled={!canNavigate(-1)}
                            title="Previous"
                            style={{
                                position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                                width: '44px', height: '44px', borderRadius: '50%',
                                background: canNavigate(-1) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.2)', padding: 0,
                                cursor: canNavigate(-1) ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: canNavigate(-1) ? 1 : 0.3, transition: 'background 0.15s', zIndex: 10,
                            }}
                            onMouseOver={(e) => { if (canNavigate(-1)) e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
                            onMouseOut={(e) => { if (canNavigate(-1)) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    )}

                    {/* Next image button */}
                    {hasNav && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onNavigate?.(+1); }}
                            disabled={!canNavigate(1)}
                            title="Next (→)"
                            style={{
                                position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                                width: '44px', height: '44px', borderRadius: '50%',
                                background: canNavigate(1) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.2)', padding: 0,
                                cursor: canNavigate(1) ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: canNavigate(1) ? 1 : 0.3, transition: 'background 0.15s', zIndex: 10,
                            }}
                            onMouseOver={(e) => { if (canNavigate(1)) e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
                            onMouseOut={(e) => { if (canNavigate(1)) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    )}

                    {/* Zoom controls + image counter */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '30px', padding: '6px 10px', zIndex: 10, userSelect: 'none',
                        }}
                    >
                        <button onClick={zoomOut} title="Zoom out (-)" style={zoomBtnStyle}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></svg>
                        </button>
                        <button onClick={resetView} title="Reset zoom (double-click image)"
                            style={{ ...zoomBtnStyle, minWidth: '52px', fontSize: '12px', fontWeight: '600', color: '#fff' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                            {Math.round(zoom * 100)}%
                        </button>
                        <button onClick={zoomIn} title="Zoom in (+)" style={zoomBtnStyle}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></svg>
                        </button>
                        {hasNav && (
                            <>
                                <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
                                    {imageIndex + 1} / {allImages.length}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            );
        }

        if (category === 'video') {
            return (
                <video
                    src={src} controls autoPlay
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        maxWidth: '90vw', maxHeight: '82vh', width: '800px',
                        borderRadius: '14px', boxShadow: '0 32px 96px rgba(0,0,0,0.7)',
                        background: '#000', display: 'block',
                        animation: 'msModalPop 0.22s cubic-bezier(.34,1.56,.64,1)',
                    }}
                />
            );
        }

        if (category === 'audio') {
            return (
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255,255,255,0.18)', borderRadius: '20px',
                        padding: '40px 48px', minWidth: '340px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px',
                        animation: 'msModalPop 0.22s cubic-bezier(.34,1.56,.64,1)',
                        boxShadow: '0 32px 96px rgba(0,0,0,0.5)',
                    }}
                >
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,#db2777,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(219,39,119,0.5)' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" /></svg>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '15px', color: '#fff', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{formatSize(fileSize)}</p>
                    </div>
                    <audio src={src} controls autoPlay style={{ width: '100%', minWidth: '280px' }} />
                </div>
            );
        }

        // PDF / Word / Excel / other — show a "download to view" card.
        return (
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.18)', borderRadius: '20px',
                    padding: '44px 52px', minWidth: '320px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
                    animation: 'msModalPop 0.22s cubic-bezier(.34,1.56,.64,1)',
                    boxShadow: '0 32px 96px rgba(0,0,0,0.5)',
                }}
            >
                <div style={{ width: '80px', height: '80px', borderRadius: '18px', background: meta?.color || '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 32px ${meta?.color || '#6b7280'}66` }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="1.5" />
                        <path d="M14 2v6h6" stroke="white" strokeWidth="1.5" />
                    </svg>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#fff', marginTop: '4px' }}>{ext.slice(0, 4)}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 6px', fontWeight: '700', fontSize: '16px', color: '#fff', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName || 'File'}</p>
                    <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{formatSize(fileSize)} · {ext}</p>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
                    This file type cannot be previewed.<br />Download it to view.
                </p>
            </div>
        );
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 99999,
                background: 'rgba(3,7,18,0.94)', backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                animation: 'msFadeIn 0.18s ease',
            }}
        >
            {/* Top bar: file info + action buttons */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)', zIndex: 20,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: 'calc(100% - 120px)' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: meta?.color || '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {category === 'image' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="white" strokeWidth="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="white" /><path d="M21 15l-5-5L5 21" stroke="white" strokeWidth="2" strokeLinecap="round" /></svg>}
                        {category === 'video' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polygon points="5,3 19,12 5,21" fill="white" /></svg>}
                        {category === 'audio' && <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" /></svg>}
                        {!['image', 'video', 'audio'].includes(category) && <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" fill="white" fillOpacity="0.4" /><path d="M14 2v6h6" stroke="white" strokeWidth="1.5" /></svg>}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '13px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeFileName || 'Media'}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                            {formatSize(activeFileSize)}{category === 'image' && zoom !== 1 ? ` · ${Math.round(zoom * 100)}%` : ''}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {activeSrc && (
                        <button
                            onClick={(e) => onDownload(e, activeSrc, activeFileName)}
                            title={downloading ? 'Downloading…' : 'Download'}
                            style={{ width: '38px', height: '38px', borderRadius: '10px', background: downloading ? 'rgba(19,104,236,0.8)' : 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', cursor: downloading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'background 0.15s', padding: 0 }}
                            onMouseOver={(e) => { if (!downloading) e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
                            onMouseOut={(e) => { if (!downloading) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                        >
                            {downloading
                                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'msSpin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2.5" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" /></svg>
                                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            }
                        </button>
                    )}
                    <button
                        onClick={onClose} title="Close (Esc)"
                        style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer', color: '#fff', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', padding: 0 }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.55)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                    >✕</button>
                </div>
            </div>

            {/* Main media content */}
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {renderContent()}
            </div>
        </div>
    );
};

export default MediaModal;
