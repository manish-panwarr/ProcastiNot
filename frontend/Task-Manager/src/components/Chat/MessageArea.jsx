import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import axiosInstance from '../../utils/axiosInstance';
import { useSocket } from '../../context/SocketContext';
import { useWebRTC } from '../../context/WebRTCContext';
import { BASE_URL } from '../../utils/apiPaths';
import { getInitials } from '../../utils/helper';
import ChatContextMenu from './ChatContextMenu';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toast';
import { GrGroup } from "react-icons/gr";

const MessageTicks = ({ status, isMe }) => {
    if (!isMe) return null;
    if (status === 'sending') return (
        <svg width="12" height="12" viewBox="0 0 24 24" style={{ display: 'inline-block', marginLeft: '4px', verticalAlign: 'middle', flexShrink: 0, animation: 'spin 2s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" fill="none" />
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </svg>
    );
    if (status === 'seen') return (
        <svg width="16" height="11" viewBox="0 0 16 11" style={{ display: 'inline-block', marginLeft: '4px', verticalAlign: 'middle', flexShrink: 0 }}>
            <path d="M1 6l3 3L11 1" stroke="#93c5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M5 6l3 3L15 1" stroke="#93c5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    );
    if (status === 'delivered') return (
        <svg width="16" height="11" viewBox="0 0 16 11" style={{ display: 'inline-block', marginLeft: '4px', verticalAlign: 'middle', flexShrink: 0 }}>
            <path d="M1 6l3 3L11 1" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M5 6l3 3L15 1" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    );
    return (
        <svg width="10" height="9" viewBox="0 0 10 9" style={{ display: 'inline-block', marginLeft: '4px', verticalAlign: 'middle', flexShrink: 0 }}>
            <path d="M1 5l3 3L9 1" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    );
};

const getFileCategory = (fileType = '', fileName = '') => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('audio/')) return 'audio';
    if (fileType.includes('pdf')) return 'pdf';
    if (fileType.includes('word') || fileName.match(/\.(doc|docx)$/i)) return 'word';
    if (fileType.includes('sheet') || fileType.includes('excel') || fileName.match(/\.(xls|xlsx|csv)$/i)) return 'excel';
    if (fileType.includes('presentation') || fileName.match(/\.(ppt|pptx)$/i)) return 'ppt';
    if (fileType.includes('zip') || fileType.includes('rar') || fileName.match(/\.(zip|rar|7z|gz|tar)$/i)) return 'archive';
    if (fileType.includes('text') || fileName.match(/\.(txt|md)$/i)) return 'text';
    return 'other';
};

const FILE_META = {
    pdf: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'PDF' },
    word: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'DOCX' },
    excel: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'XLSX' },
    ppt: { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', label: 'PPTX' },
    archive: { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'ZIP' },
    text: { color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', label: 'TXT' },
    audio: { color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', label: 'Audio' },
    other: { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', label: 'File' },
};

const formatSize = (b) => {
    if (!b) return '';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const MediaModal = ({ src, fileName, fileType, fileSize, category, meta, onClose, onDownload, downloading, allImages, imageIndex, onNavigate }) => {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const imgRef = useRef(null);

    useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [src]);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') { onClose(); return; }
            if (category === 'image') {
                if (e.key === 'ArrowLeft') { onNavigate?.(-1); }
                if (e.key === 'ArrowRight') { onNavigate?.(+1); }
                if (e.key === '+' || e.key === '=') { setZoom(z => Math.min(z + 0.25, 5)); }
                if (e.key === '-') { setZoom(z => Math.max(z - 0.25, 0.2)); }
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose, onNavigate, category]);

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setZoom(z => Math.min(Math.max(z + delta, 0.2), 5));
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
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
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

    const zoomIn = (e) => { e.stopPropagation(); setZoom(z => Math.min(z + 0.25, 5)); };
    const zoomOut = (e) => { e.stopPropagation(); setZoom(z => Math.max(z - 0.25, 0.2)); };
    const resetView = (e) => { e.stopPropagation(); setZoom(1); setPan({ x: 0, y: 0 }); };

    const ext = fileName ? fileName.split('.').pop().toUpperCase() : (meta?.label || 'File');
    const hasNav = allImages && allImages.length > 1;
    const canNavigate = (dir) => {
        if (!hasNav) return false;
        const next = imageIndex + dir;
        return next >= 0 && next < allImages.length;
    };

    const currentItem = (hasNav && allImages[imageIndex]) || { src, fileName, fileSize };

    const renderContent = () => {
        if (category === 'image') {
            return (
                <div
                    style={{
                        position: 'relative',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '100%', height: 'calc(100vh - 120px)',
                        overflow: 'hidden',
                    }}
                    onWheel={handleWheel}
                >
                    <img
                        ref={imgRef}
                        src={currentItem.src}
                        alt={currentItem.fileName}
                        onMouseDown={handleMouseDown}
                        onDoubleClick={resetView}
                        draggable={false}
                        style={{
                            maxWidth: '90vw', maxHeight: '80vh',
                            objectFit: 'contain',
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transformOrigin: 'center center',
                            transition: isDragging.current ? 'none' : 'transform 0.15s ease',
                            cursor: zoom > 1 ? (isDragging.current ? 'grabbing' : 'grab') : 'default',
                            userSelect: 'none',
                            borderRadius: zoom <= 1 ? '14px' : '4px',
                            boxShadow: '0 32px 96px rgba(0,0,0,0.7)',
                            animation: 'msModalPop 0.22s cubic-bezier(.34,1.56,.64,1)',
                        }}
                        onError={e => { e.target.alt = 'Failed to load'; }}
                    />

                    {hasNav && (
                        <button
                            onClick={e => { e.stopPropagation(); onNavigate?.(-1); }}
                            disabled={!canNavigate(-1)}
                            title="Previous (←)"
                            style={{
                                position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                                width: '44px', height: '44px', borderRadius: '50%',
                                background: canNavigate(-1) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                cursor: canNavigate(-1) ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'background 0.15s', zIndex: 10, padding: 0,
                                opacity: canNavigate(-1) ? 1 : 0.3,
                            }}
                            onMouseOver={e => { if (canNavigate(-1)) e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
                            onMouseOut={e => { if (canNavigate(-1)) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    )}

                    {hasNav && (
                        <button
                            onClick={e => { e.stopPropagation(); onNavigate?.(+1); }}
                            disabled={!canNavigate(1)}
                            title="Next (→)"
                            style={{
                                position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                                width: '44px', height: '44px', borderRadius: '50%',
                                background: canNavigate(1) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                cursor: canNavigate(1) ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'background 0.15s', zIndex: 10, padding: 0,
                                opacity: canNavigate(1) ? 1 : 0.3,
                            }}
                            onMouseOver={e => { if (canNavigate(1)) e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
                            onMouseOut={e => { if (canNavigate(1)) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    )}

                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '30px', padding: '6px 10px',
                            zIndex: 10, userSelect: 'none',
                        }}
                    >
                        <button onClick={zoomOut} title="Zoom out (-)" style={zoomBtnStyle} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></svg>
                        </button>
                        <button onClick={resetView} title="Reset zoom (double-click image)" style={{ ...zoomBtnStyle, minWidth: '52px', fontSize: '12px', fontWeight: '600', color: '#fff', fontFamily: "'Poppins', sans-serif" }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            {Math.round(zoom * 100)}%
                        </button>
                        <button onClick={zoomIn} title="Zoom in (+)" style={zoomBtnStyle} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></svg>
                        </button>
                        {hasNav && (
                            <>
                                <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontFamily: "'Poppins', sans-serif", whiteSpace: 'nowrap' }}>
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
                    src={src}
                    controls
                    autoPlay
                    onClick={e => e.stopPropagation()}
                    style={{
                        maxWidth: '90vw', maxHeight: '82vh', width: '800px',
                        borderRadius: '14px',
                        boxShadow: '0 32px 96px rgba(0,0,0,0.7)',
                        background: '#000',
                        display: 'block',
                        animation: 'msModalPop 0.22s cubic-bezier(.34,1.56,.64,1)',
                    }}
                />
            );
        }
        if (category === 'audio') {
            return (
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: 'rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        borderRadius: '20px',
                        padding: '40px 48px',
                        minWidth: '340px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px',
                        animation: 'msModalPop 0.22s cubic-bezier(.34,1.56,.64,1)',
                        boxShadow: '0 32px 96px rgba(0,0,0,0.5)',
                    }}
                >
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,#db2777,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 32px rgba(219,39,119,0.5)' }}>
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
        // PDF / word / excel / other documents
        return (
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: '20px',
                    padding: '44px 52px',
                    minWidth: '320px',
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
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>This file type cannot be previewed.<br />Download it to view.</p>
            </div>
        );
    };

    const activeFileName = category === 'image' && hasNav ? currentItem.fileName : fileName;
    const activeFileSize = category === 'image' && hasNav ? currentItem.fileSize : fileSize;
    const activeSrc = category === 'image' && hasNav ? currentItem.src : src;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 99999,
                background: 'rgba(3,7,18,0.94)',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column',
                animation: 'msFadeIn 0.18s ease',
                fontFamily: "'Poppins', sans-serif",
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    padding: '14px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)',
                    zIndex: 20,
                }}
            >
                {/* File name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: 'calc(100% - 120px)' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: meta?.color || '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {category === 'image' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="white" strokeWidth="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="white" /><path d="M21 15l-5-5L5 21" stroke="white" strokeWidth="2" strokeLinecap="round" /></svg>}
                        {category === 'video' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polygon points="5,3 19,12 5,21" fill="white" /></svg>}
                        {category === 'audio' && <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" /></svg>}
                        {!['image', 'video', 'audio'].includes(category) && <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" fill="white" fillOpacity="0.4" /><path d="M14 2v6h6" stroke="white" strokeWidth="1.5" /></svg>}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '13px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeFileName || 'Media'}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{formatSize(activeFileSize)}{category === 'image' && zoom !== 1 ? ` · ${Math.round(zoom * 100)}%` : ''}</p>
                    </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {activeSrc && (
                        <button
                            onClick={e => onDownload(e, activeSrc, activeFileName)}
                            title={downloading ? 'Downloading…' : 'Download'}
                            style={{ width: '38px', height: '38px', borderRadius: '10px', background: downloading ? 'rgba(19,104,236,0.8)' : 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', cursor: downloading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'background 0.15s', padding: 0 }}
                            onMouseOver={e => { if (!downloading) e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
                            onMouseOut={e => { if (!downloading) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                        >
                            {downloading
                                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'msSpin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2.5" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" /></svg>
                                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            }
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        title="Close (Esc)"
                        style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer', color: '#fff', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', padding: 0 }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.55)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={category === 'image' ? undefined : undefined}>
                {renderContent()}
            </div>
        </div>
    );
};

const zoomBtnStyle = {
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'transparent', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s', padding: 0,
};


const FileBubble = ({ fileTransfer, isMe, isP2P = false, allImages, imageIndex = 0 }) => {
    const [modal, setModal] = useState(false);
    const [activeIdx, setActiveIdx] = useState(imageIndex);
    const [hovered, setHovered] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const { fileName, fileSize, fileType, mediaUrl } = fileTransfer || {};
    const category = getFileCategory(fileType, fileName);
    const meta = FILE_META[category] || FILE_META.other;
    const src = mediaUrl
        ? (mediaUrl.startsWith('http') || mediaUrl.startsWith('data:') ? mediaUrl : `${BASE_URL}${mediaUrl}`)
        : null;

    const handleDownload = async (e, url, name) => {
        e.stopPropagation();
        if (!url || downloading) return;
        if (url.startsWith('data:')) {
            const a = document.createElement('a');
            a.href = url;
            a.download = name || 'media';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        }
        setDownloading(true);
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = name || 'media';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } catch (err) {
            console.error('Download failed:', err);
            window.open(url, '_blank', 'noreferrer');
        } finally {
            setDownloading(false);
        }
    };

    // For gallery navigation inside modal
    const handleNavigate = (dir) => {
        if (!allImages) return;
        const next = activeIdx + dir;
        if (next >= 0 && next < allImages.length) setActiveIdx(next);
    };

    const activeImage = (allImages && allImages[activeIdx]) || { src, fileName, fileSize };

    const modalEl = modal && src
        ? ReactDOM.createPortal(
            <MediaModal
                src={activeImage.src}
                fileName={activeImage.fileName}
                fileType={fileType}
                fileSize={activeImage.fileSize}
                category={category}
                meta={meta}
                onClose={() => { setModal(false); setActiveIdx(imageIndex); }}
                onDownload={handleDownload}
                downloading={downloading}
                allImages={allImages}
                imageIndex={activeIdx}
                onNavigate={handleNavigate}
            />,
            document.body
        )
        : null;

    if (category === 'image') {
        if (!src) return (
            <div style={{ width: '220px', height: '140px', borderRadius: '12px', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>Image unavailable</span>
            </div>
        );
        return (
            <>
                <div
                    onClick={() => setModal(true)}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    style={{ cursor: 'zoom-in', borderRadius: '12px', overflow: 'hidden', maxWidth: '280px', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', position: 'relative' }}
                >
                    <img
                        src={src}
                        alt={fileName}
                        style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block', transition: 'transform 0.2s ease' }}
                        onError={e => { e.target.style.display = 'none'; }}
                    />
                    {/* Hover overlay */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: hovered ? 1 : 0,
                        transition: 'opacity 0.18s ease',
                    }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(255,255,255,0.4)' }}>
                            {/* Expand icon */}
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                    <button
                        onClick={e => handleDownload(e, src, fileName || 'image')}
                        title={downloading ? 'Downloading…' : 'Download'}
                        style={{
                            position: 'absolute', bottom: '8px', right: '8px',
                            width: '30px', height: '30px', borderRadius: '50%',
                            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                            border: 'none', cursor: downloading ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: hovered ? 1 : 0, transition: 'opacity 0.18s ease', zIndex: 2, padding: 0,
                        }}
                    >
                        {downloading
                            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: 'msSpin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2.5" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" /></svg>
                            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        }
                    </button>
                </div>
                {modalEl}
            </>
        );
    }

    if (category === 'video') {
        if (!src) return <div style={{ padding: '10px 14px', background: isMe ? 'rgba(255,255,255,0.12)' : '#f3f4f6', borderRadius: '10px', fontSize: '13px' }}>🎞 Video unavailable</div>;
        return (
            <>
                <div
                    onClick={() => setModal(true)}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    style={{ cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', maxWidth: '300px', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', position: 'relative', background: '#000' }}
                >
                    {/* Video thumbnail */}
                    <video
                        src={src}
                        style={{ width: '100%', display: 'block', maxHeight: '220px', background: '#000', pointerEvents: 'none' }}
                        preload="metadata"
                        muted
                    />
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: hovered ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.18s ease',
                    }}>
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '50%',
                            background: hovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                            transform: hovered ? 'scale(1.08)' : 'scale(1)',
                            transition: 'all 0.18s ease',
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginLeft: '3px' }}>
                                <polygon points="5,3 19,12 5,21" fill="#1368EC" />
                            </svg>
                        </div>
                    </div>
                    <button
                        onClick={e => handleDownload(e, src, fileName || 'video')}
                        title={downloading ? 'Downloading…' : 'Download'}
                        style={{
                            position: 'absolute', bottom: '8px', right: '8px',
                            width: '30px', height: '30px', borderRadius: '50%',
                            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                            border: 'none', cursor: downloading ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: hovered ? 1 : 0, transition: 'opacity 0.18s ease', zIndex: 2, padding: 0,
                        }}
                    >
                        {downloading
                            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: 'msSpin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2.5" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" /></svg>
                            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        }
                    </button>
                </div>
                {modalEl}
            </>
        );
    }

    if (category === 'audio') {
        return (
            <>
                <div
                    onClick={() => src && setModal(true)}
                    style={{
                        display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 14px',
                        background: isMe ? 'rgba(255,255,255,0.12)' : '#fdf2f8',
                        border: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : '#fbcfe8'}`,
                        borderRadius: '14px', minWidth: '220px',
                        cursor: src ? 'pointer' : 'default',
                    }}
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
                {modalEl}
            </>
        );
    }

    // OTHER FILES (PDF, DOCX, ZIP, etc.)    
    const ext = fileName ? fileName.split('.').pop().toUpperCase() : meta.label;
    return (
        <>
            <div
                onClick={() => src && setModal(true)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                    background: isMe ? 'rgba(255,255,255,0.12)' : meta.bg,
                    border: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : meta.border}`,
                    borderRadius: '14px', minWidth: '200px', maxWidth: '280px',
                    cursor: 'pointer',
                    transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
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
                    onClick={e => handleDownload(e, src, fileName)}
                    title={downloading ? 'Downloading…' : 'Download file'}
                    style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: meta.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: downloading ? 'wait' : 'pointer',
                        flexShrink: 0, padding: 0, opacity: downloading ? 0.7 : 1,
                        transition: 'opacity 0.15s',
                    }}
                >
                    {downloading
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'msSpin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2.5" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" /></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    }
                </button>
            </div>
            {modalEl}
        </>
    );
};

const MessageArea = ({ selectedUser, selectedGroup, currentUser, onOpenProfile, conversationId: passedConvId, onBack }) => {
    const { socket, onlineUsers } = useSocket();
    const { sendP2PMessage, p2pMessages, clearP2PMessages } = useWebRTC();
    const { addToast, ToastContainer } = useToast();

    const getFullUrl = (path) => {
        if (!path) return '';
        return path.startsWith('http') ? path : `${BASE_URL}${path}`;
    };

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [files, setFiles] = useState([]);
    const [sending, setSending] = useState(false);
    const [conversationId, setConversationId] = useState(passedConvId || null);
    const [isTyping, setIsTyping] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [useP2P, setUseP2P] = useState(false);
    const isNearBottomRef = useRef(true);
    const justSwitchedConvRef = useRef(false);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const menuRef = useRef(null);
    const textareaRef = useRef(null);

    const isGroup = !!selectedGroup;
    const target = selectedGroup || selectedUser;

    const isTargetOnline = selectedUser ? onlineUsers.includes(selectedUser._id?.toString()) : false;
    const isSystemAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
    const isGroupAdmin = selectedGroup?.groupAdmins?.some(a => (a._id || a) === currentUser?._id);
    const canSendMessage = !isGroup || selectedGroup?.messagingMode === 'everyone' || isGroupAdmin || isSystemAdmin;

    useEffect(() => {
        setConversationId(passedConvId || null);
    }, [passedConvId]);

    useEffect(() => {
        if (!socket) return;
        if (isGroup && selectedGroup?._id) {
            socket.emit("join_group", selectedGroup._id);
            return () => socket.emit("leave_group", selectedGroup._id);
        }
    }, [socket, isGroup, selectedGroup?._id]);

    useEffect(() => {
        if (target) {
            justSwitchedConvRef.current = true;
            fetchMessages();
        } else {
            setMessages([]);
            setConversationId(null);
            setFiles([]);
            setNewMessage('');
        }
    }, [selectedUser, selectedGroup]);

    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (message) => {
            const senderId = message.sender?._id || message.sender;

            if (message.conversationId && isGroup && message.conversationId === conversationId) {
                setMessages(prev => {
                    if (prev.some(m => m._id === message._id)) return prev;
                    return [...prev, message];
                });
                return;
            }

            // P2P Logic
            if (!isGroup && selectedUser && senderId === selectedUser._id) {
                setMessages(prev => {
                    if (prev.some(m => m._id === message._id)) return prev;
                    return [...prev, message];
                });
                if (conversationId) {
                    axiosInstance.put(`/api/chat/seen/${conversationId}`).catch(() => { });
                    socket.emit("mark_seen", { conversationId, senderId: selectedUser._id });
                }
            }
        };

        const handleGroupMessage = (message) => {
            if (isGroup && message.conversationId === conversationId) {
                setMessages(prev => {
                    if (prev.some(m => m._id === message._id)) return prev;
                    return [...prev, message];
                });
            }
        };

        const handleTyping = ({ senderId, isTyping: typing }) => {
            if (!isGroup && selectedUser && senderId === selectedUser._id) setIsTyping(typing);
        };

        const handleMessagesSeen = ({ conversationId: convId }) => {
            if (convId === conversationId) {
                setMessages(prev => prev.map(msg => {
                    const sid = msg.sender?._id || msg.sender;
                    // Mark as seen for messages sent by me
                    return (sid === currentUser?._id && msg.status !== 'seen') ? { ...msg, status: 'seen' } : msg;
                }));
            }
        };

        const handleMessageDeleted = ({ messageId, type, conversationId: convId }) => {
            if (convId !== conversationId) return;
            if (type === 'forEveryone') {
                setMessages(prev => prev.map(m => m._id === messageId ? { ...m, _isDeletedForEveryone: true, text: null, fileTransfer: null } : m));
            } else {
                setMessages(prev => prev.filter(m => m._id !== messageId));
            }
        };

        const handleChatCleared = ({ conversationId: convId }) => {
            if (convId === conversationId) {
                setMessages([]);
                if (selectedUser && clearP2PMessages) clearP2PMessages(selectedUser._id);
            }
        };

        const handleP2pRequest = ({ senderId, senderName }) => {
            setConfirmDialog({
                title: `${senderName} wants to chat privately!`,
                body: 'Do you want to enable P2P mode?',
                confirmText: 'P2P ON',
                confirmStyle: 'primary',
                onConfirm: () => {
                    setConfirmDialog(null);
                    if (!isGroup && selectedUser && selectedUser._id === senderId) {
                        setUseP2P(true);
                    }
                    socket.emit('accept_p2p', { senderId });
                    addToast('P2P enabled!', 'success');
                },
                onCancel: () => {
                    setConfirmDialog(null);
                    socket.emit('reject_p2p', { senderId });
                }
            });
        };

        const handleP2pAccepted = () => {
            setUseP2P(true);
            addToast('P2P request accepted! Chat is now private.', 'success');
        };

        const handleP2pRejected = () => {
            setUseP2P(false);
            addToast("Receiver doesn't want to chat in P2P", 'error');
        };

        const handleP2pCancelled = () => {
            setUseP2P(false);
            addToast("P2P mode was cancelled by the sender", 'info');
        };

        socket.on("receive_message", handleReceiveMessage);
        socket.on("receive_group_message", handleGroupMessage);
        socket.on("user_typing", handleTyping);
        socket.on("messages_seen", handleMessagesSeen);
        socket.on("message_deleted", handleMessageDeleted);
        socket.on("chat_cleared", handleChatCleared);
        socket.on("p2p_request", handleP2pRequest);
        socket.on("p2p_accepted", handleP2pAccepted);
        socket.on("p2p_rejected", handleP2pRejected);
        socket.on("p2p_cancelled", handleP2pCancelled);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            socket.off("receive_group_message", handleGroupMessage);
            socket.off("user_typing", handleTyping);
            socket.off("messages_seen", handleMessagesSeen);
            socket.off("message_deleted", handleMessageDeleted);
            socket.off("chat_cleared", handleChatCleared);
            socket.off("p2p_request", handleP2pRequest);
            socket.off("p2p_accepted", handleP2pAccepted);
            socket.off("p2p_rejected", handleP2pRejected);
            socket.off("p2p_cancelled", handleP2pCancelled);
        };
    }, [socket, selectedUser, selectedGroup, conversationId, currentUser, isGroup]);


    useEffect(() => {
        const container = messagesContainerRef.current;
        const end = messagesEndRef.current;
        if (!container || !end) return;

        if (justSwitchedConvRef.current) {

            end.scrollIntoView({ behavior: 'instant' });
            justSwitchedConvRef.current = false;
            isNearBottomRef.current = true;
        } else if (isNearBottomRef.current) {
            end.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);


    const handleScroll = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const { scrollTop, scrollHeight, clientHeight } = container;
        isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchMessages = async () => {
        try {
            if (isGroup) {
                const msgRes = await axiosInstance.get(`/api/chat/messages/${selectedGroup._id}`);
                setMessages(msgRes.data);
                setConversationId(selectedGroup._id);
                return;
            }
            const res = await axiosInstance.get('/api/chat/conversations');
            const conversations = Array.isArray(res.data) ? res.data : [];
            const conv = conversations.find(c => !c.isGroup && c.participants?.some(p => (p._id || p) === selectedUser._id));
            if (conv) {
                setConversationId(conv._id);
                const msgRes = await axiosInstance.get(`/api/chat/messages/${conv._id}`);
                setMessages(msgRes.data);
                await axiosInstance.put(`/api/chat/seen/${conv._id}`).catch(() => { });
            } else {
                setConversationId(null);
                setMessages([]);
            }
        } catch (error) {
            console.error("Error fetching messages", error);
        }
    };

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        // Auto-grow textarea
        const ta = e.target;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
        if (socket && selectedUser) {
            socket.emit('typing', { recipientId: selectedUser._id, isTyping: true });
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('typing', { recipientId: selectedUser._id, isTyping: false });
            }, 1500);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files)]);
        e.target.value = null;
    };

    const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));

    const handleSend = async (e) => {
        e?.preventDefault();
        if ((!newMessage.trim() && files.length === 0) || !target || sending) return;
        if (!canSendMessage) {
            addToast('Only admins can send messages in this group', 'error');
            return;
        }
        setSending(true);
        if (socket && selectedUser) socket.emit("typing", { recipientId: selectedUser._id, isTyping: false });

        //  P2P SENDING  
        if (useP2P && !isGroup && selectedUser) {
            try {
                // Send text
                if (newMessage.trim()) {
                    await sendP2PMessage(selectedUser._id, newMessage.trim());
                }

                // Send files: PDF goes to DB, rest goes to P2P
                if (files.length > 0) {
                    const p2pFiles = [];
                    const dbFiles = [];
                    for (const file of files) {
                        const cat = getFileCategory(file.type, file.name);
                        if (cat === 'pdf') {
                            dbFiles.push(file);
                        } else {
                            p2pFiles.push(file);
                        }
                    }

                    for (const file of p2pFiles) {
                        try {
                            await sendP2PMessage(selectedUser._id, null, file);
                        } catch (fErr) {
                            addToast(`Failed to send ${file.name}: ${fErr.message}`, 'error');
                        }
                    }

                    if (dbFiles.length > 0) {
                        const formData = new FormData();
                        formData.append('recipientId', selectedUser._id);
                        dbFiles.forEach(file => formData.append('files', file));
                        try {
                            const res = await axiosInstance.post('/api/chat/send', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                            });

                            const newMsgs = Array.isArray(res.data) ? res.data : [res.data];
                            setMessages(prev => {
                                const uniqueNewMsgs = newMsgs.filter(msg => !prev.some(p => p._id === msg._id));
                                return [...prev, ...uniqueNewMsgs];
                            });

                            if (socket) {
                                newMsgs.forEach(msg => {
                                    socket.emit("send_message", { ...msg, recipientId: selectedUser._id });
                                });
                            }
                        } catch (error) {
                            console.error("Failed to send DB files in P2P mode", error);
                        }
                    }
                }
                setNewMessage('');
                setFiles([]);
            } catch (err) {
                console.error("P2P Send Error", err);
                addToast(err.message || "P2P Send Failed", 'error');
            } finally {
                setSending(false);
            }
            return;
        }

        //  DB SENDING LOGIC 
        const msgText = newMessage.trim();
        const msgFiles = [...files];

        const tempMsgs = [];
        if (msgText) {
            tempMsgs.push({
                _id: 'temp-' + Date.now() + '-text',
                text: msgText,
                sender: currentUser,
                status: 'sending',
                createdAt: new Date().toISOString()
            });
        }

        msgFiles.forEach((file, index) => {
            let mediaUrl = null;
            if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                mediaUrl = URL.createObjectURL(file);
            }
            tempMsgs.push({
                _id: 'temp-' + Date.now() + '-file-' + index,
                sender: currentUser,
                status: 'sending',
                fileTransfer: {
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    mediaUrl: mediaUrl
                },
                createdAt: new Date().toISOString()
            });
        });

        if (tempMsgs.length > 0) {
            setMessages(prev => [...prev, ...tempMsgs]);
        }

        setNewMessage('');
        setFiles([]);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        try {
            const formData = new FormData();
            if (isGroup) {
                formData.append('conversationId', selectedGroup._id);
            } else {
                formData.append('recipientId', selectedUser._id);
            }
            if (msgText) formData.append('text', msgText);
            msgFiles.forEach(file => formData.append('files', file));

            const res = await axiosInstance.post('/api/chat/send', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const newMsgs = Array.isArray(res.data) ? res.data : [res.data];

            const tempIds = tempMsgs.map(t => t._id);
            setMessages(prev => {
                const filtered = prev.filter(p => !tempIds.includes(p._id));
                const uniqueNewMsgs = newMsgs.filter(msg => !filtered.some(p => p._id === msg._id));
                return [...filtered, ...uniqueNewMsgs];
            });

            const lastMsg = newMsgs[newMsgs.length - 1];
            if (!conversationId && lastMsg?.conversationId) setConversationId(lastMsg.conversationId);

            if (socket && !isGroup) {
                newMsgs.forEach(msg => {
                    socket.emit("send_message", { ...msg, recipientId: selectedUser._id });
                });
            }
        } catch (error) {
            const tempIds = tempMsgs.map(t => t._id);
            setMessages(prev => prev.filter(p => !tempIds.includes(p._id)));
            addToast(error.response?.data?.message || 'Failed to send message', 'error');
        } finally {
            setSending(false);
            tempMsgs.forEach(m => {
                if (m.fileTransfer?.mediaUrl?.startsWith('blob:')) {
                    URL.revokeObjectURL(m.fileTransfer.mediaUrl);
                }
            });
        }
    };

    // Merge DB messages and P2P messages
    const localP2P = (currentUser && !isGroup && selectedUser) ? (p2pMessages[selectedUser._id] || []) : [];
    const formattedP2P = localP2P.map(p => ({
        _id: p.id || String(Date.now() + Math.random()),
        text: p.text || null,
        sender: String(p.senderId) === String(currentUser?._id) ? currentUser : selectedUser,
        fileTransfer: p.file ? {
            fileName: p.file.name,
            fileType: p.file.type,
            fileSize: p.file.size,
            mediaUrl: p.file.data,
        } : null,
        createdAt: p.timestamp || new Date().toISOString(),
        status: 'sent',
        isP2P: true,
    }));

    const allMessages = [...messages, ...formattedP2P].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const handleContextMenu = (e, msg) => {
        e.preventDefault();
        const senderId = msg.sender?._id || msg.sender;
        const isMe = senderId === currentUser?._id;
        setContextMenu({ x: e.clientX, y: e.clientY, messageId: msg._id, isMe });
    };

    const deleteMessage = async (messageId, type) => {
        setConfirmDialog({
            title: type === 'forEveryone' ? 'Delete for everyone?' : 'Delete for me?',
            body: type === 'forEveryone' ? 'This message will be removed for all participants.' : 'This message will be removed only for you.',
            onConfirm: async () => {
                setConfirmDialog(null);
                try {
                    await axiosInstance.delete(`/api/chat/message/${messageId}?type=${type}`);
                    if (type === 'forEveryone') {
                        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, _isDeletedForEveryone: true, text: null, fileTransfer: null } : m));
                        if (socket && selectedUser) {
                            socket.emit('message_deleted_event', { conversationId, messageId, type, recipientId: selectedUser._id });
                        }
                    } else {
                        setMessages(prev => prev.filter(m => m._id !== messageId));
                    }
                    addToast('Message deleted', 'info');
                } catch {
                    addToast('Failed to delete message', 'error');
                }
            }
        });
    };

    const handleDeleteAllChats = () => {
        setShowMenu(false);
        if (!conversationId && (!selectedUser || !p2pMessages[selectedUser._id] || p2pMessages[selectedUser._id].length === 0)) {
            addToast('No conversation to delete', 'info');
            return;
        }
        setConfirmDialog({
            title: 'Delete all messages?',
            body: 'Are you sure you want to delete all messages? This action cannot be undone.',
            confirmText: 'Delete',
            onConfirm: async () => {
                setConfirmDialog(null);
                try {
                    if (conversationId) {
                        if (isGroup) {

                            await axiosInstance.delete(`/api/chat/clear/${conversationId}`);
                        } else {

                            await axiosInstance.delete(`/api/chat/conversation/${conversationId}`);
                        }
                    }
                    setMessages([]);
                    if (selectedUser && clearP2PMessages) {
                        clearP2PMessages(selectedUser._id);
                    }
                    if (useP2P) {
                        setUseP2P(false);
                    }
                    if (socket && selectedUser) {
                        socket.emit('chat_cleared_event', { conversationId, recipientId: selectedUser._id });
                    }
                    addToast('Chat deleted successfully', 'success');
                } catch {
                    addToast('Failed to delete chat', 'error');
                }
            }
        });
    };

    if (!target) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f4ff 0%, #fafbff 100%)' }}>
                <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#1368EC' }}>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <p style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.3px' }}>Select a conversation</p>
                    <p style={{ fontSize: '14px', margin: 0, color: '#64748b' }}>Choose a contact or group to start chatting</p>
                </div>
            </div>
        );
    }


    const MEDIA_BASE = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';
    const allConvImages = [];
    allMessages.forEach(m => {
        if (m._isDeletedForEveryone) return;
        const ft = m.fileTransfer;
        const imgUrl = m.image && !ft ? m.image : null;
        if (ft?.fileName) {
            const cat = getFileCategory(ft.fileType, ft.fileName);
            if (cat === 'image') {
                const s = ft.mediaUrl
                    ? (ft.mediaUrl.startsWith('http') || ft.mediaUrl.startsWith('data:') ? ft.mediaUrl : `${MEDIA_BASE}${ft.mediaUrl}`)
                    : null;
                if (s) allConvImages.push({ src: s, fileName: ft.fileName, fileSize: ft.fileSize });
            }
        } else if (imgUrl) {
            const s = imgUrl.startsWith('http') || imgUrl.startsWith('data:') ? imgUrl : `${MEDIA_BASE}${imgUrl}`;
            allConvImages.push({ src: s, fileName: 'image.jpg', fileSize: 0 });
        }
    });
    let imgCounter = -1;

    const msgImageIndexMap = {};
    allMessages.forEach((m, mIdx) => {
        if (m._isDeletedForEveryone) return;
        const ft = m.fileTransfer;
        const cat = ft?.fileName ? getFileCategory(ft.fileType, ft.fileName) : null;
        const hasImg = m.image && !ft;
        if (cat === 'image' || hasImg) {
            msgImageIndexMap[m._id || mIdx] = ++imgCounter;
        }
    });


    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f4ff', overflow: 'hidden', position: 'relative' }}>
            <ToastContainer />
            <div style={{
                padding: '12px 16px', background: '#fff',
                borderBottom: '1px solid #e8eef8',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)', flexShrink: 0,
                fontFamily: "'Poppins', sans-serif"
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                            onClick={onOpenProfile}
                            title="View profile"
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                borderRadius: isGroup ? '12px' : '50%', display: 'flex', alignItems: 'center'
                            }}
                        >
                            <div style={{
                                width: '42px', height: '42px',
                                borderRadius: isGroup ? '13px' : '50%',
                                background: isGroup ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'linear-gradient(135deg, #1368EC, #3b82f6)',
                                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: '700', fontSize: '14px', overflow: 'hidden',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                            }}>
                                {isGroup
                                    ? (selectedGroup.groupAvatar ? <img src={getFullUrl(selectedGroup.groupAvatar)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <GrGroup />)
                                    : (selectedUser.profileImageUrl ? <img src={getFullUrl(selectedUser.profileImageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(selectedUser.name))
                                }
                            </div>
                        </button>

                        {onBack && (
                            <button
                                onClick={onBack}
                                title="Back"
                                style={{
                                    position: 'absolute', top: '-6px', left: '-10px',
                                    width: '20px', height: '20px', borderRadius: '50%',
                                    background: '#1368EC',
                                    border: '2px solid #fff',
                                    boxShadow: '0 2px 8px rgba(19,104,236,0.4)',
                                    cursor: 'pointer', padding: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.18s',
                                    zIndex: 10,
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = '#0f52c4'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                onMouseOut={e => { e.currentTarget.style.background = '#1368EC'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                                    <path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <p style={{ fontWeight: '500', fontSize: '15px', color: '#0f172a', margin: 0, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.2px' }}>
                                {isGroup ? selectedGroup.groupName : selectedUser.name}
                            </p>
                            {!isGroup && (
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                                    fontSize: '10px', fontWeight: '500',
                                    fontFamily: "'Poppins', sans-serif",
                                    background: useP2P ? 'linear-gradient(135deg,#dcfce7,#bbf7d0)' : '#f1f5f9',
                                    padding: '2px 8px 2px 6px', borderRadius: '20px',
                                    color: useP2P ? '#15803d' : '#64748b',
                                    border: useP2P ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                                    transition: 'all 0.2s', userSelect: 'none',
                                    boxShadow: useP2P ? '0 2px 8px rgba(34,197,94,0.22)' : 'none',
                                }}>
                                    <input type="checkbox" checked={useP2P} onChange={e => {
                                        const checked = e.target.checked;
                                        if (checked) {
                                            if (socket && selectedUser) {
                                                socket.emit('request_p2p', { recipientId: selectedUser._id, senderId: currentUser._id, senderName: currentUser.name });
                                                addToast('P2P request sent... waiting for response', 'info');
                                            }
                                        } else {
                                            setUseP2P(false);
                                            if (socket && selectedUser) {
                                                socket.emit('cancel_p2p', { recipientId: selectedUser._id });
                                            }
                                        }
                                    }} style={{ display: 'none' }} />
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    {/* P2P */}
                                </label>
                            )}
                        </div>
                        <p style={{ fontSize: '11.5px', color: isGroup ? '#7c3aed' : (isTargetOnline ? '#22c55e' : '#94a3b8'), margin: '1px 0 0', fontWeight: '500', fontFamily: "'Poppins', sans-serif", display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isGroup ? (
                                <>{selectedGroup.participants?.length || 0} members &nbsp;·&nbsp; {selectedGroup.messagingMode === 'admin_only' ? '🔒 Admins only' : 'Everyone can message'}</>
                            ) : (
                                isTargetOnline
                                    ? <><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 0 2px rgba(34,197,94,0.25)' }} /> Online</>
                                    : <><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} /> Offline</>
                            )}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ position: 'relative' }} ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(prev => !prev)}
                            title="More options"
                            style={{
                                border: '1px solid #e8eef8', borderRadius: '10px', padding: '9px 11px',
                                cursor: 'pointer', color: '#374151', background: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s'
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                            onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e8eef8'; }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                                <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                            </svg>
                        </button>
                        {showMenu && (
                            <div style={{
                                position: 'absolute', right: 0, top: '110%',
                                background: '#fff', borderRadius: '14px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                                border: '1px solid #e8eef8', zIndex: 1000,
                                minWidth: '180px', padding: '6px',
                                animation: 'msCtxIn 0.15s ease',
                                fontFamily: "'Poppins', sans-serif"
                            }}>
                                <div
                                    onClick={handleDeleteAllChats}
                                    style={{ padding: '10px 14px', cursor: 'pointer', color: '#ef4444', fontSize: '13px', borderRadius: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    Delete Chat
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                style={{
                    flex: 1, overflowY: 'auto', padding: '16px 20px',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                    backgroundImage: `radial-gradient(circle at 20% 50%, rgba(99,102,241,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(19,104,236,0.04) 0%, transparent 50%)`,
                    background: '#f0f4ff'
                }}>
                {allMessages.length === 0 && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                                {isGroup ?
                                    <GrGroup style={{ fontSize: '40px', color: '#64748b' }} /> :
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}>
                                        <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"></path>
                                        <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"></path>
                                    </svg>
                                }
                            </div>
                            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                {isGroup ? `Welcome to ${selectedGroup.groupName}!` : 'No messages yet. Say hello!'}
                            </p>
                        </div>
                    </div>
                )}

                {allMessages.map((msg, index) => {
                    const senderId = msg.sender?._id || msg.sender;
                    const isMe = senderId === currentUser?._id;

                    if (msg._isDeletedForEveryone) {
                        return (
                            <div key={msg._id || index} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                <div style={{ padding: '8px 14px', borderRadius: '14px', background: 'rgba(241,245,249,0.8)', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic', border: '1px solid #e8eef8', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                                    This message was deleted
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={msg._id || index}
                            onContextMenu={e => handleContextMenu(e, msg)}
                            style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}
                        >
                            {!isMe && (
                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0, overflow: 'hidden' }}>
                                    {msg.sender?.profileImageUrl
                                        ? <img src={getFullUrl(msg.sender.profileImageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : getInitials(msg.sender?.name || '?')
                                    }
                                </div>
                            )}
                            <div style={{ maxWidth: '68%' }}>
                                {isGroup && !isMe && (
                                    <p style={{ margin: '0 0 3px 4px', fontSize: '11px', fontWeight: '700', color: '#7c3aed' }}>
                                        {msg.sender?.name || 'Unknown'}
                                    </p>
                                )}
                                {(() => {
                                    const hasFT = !!msg.fileTransfer?.fileName;
                                    const hasImg = !!(msg.image && !msg.fileTransfer);
                                    const isMediaOnly = (hasFT || hasImg) && !msg.text;
                                    const ftCat = hasFT ? getFileCategory(msg.fileTransfer.fileType, msg.fileTransfer.fileName) : null;
                                    const isVisualMedia = isMediaOnly && (ftCat === 'image' || ftCat === 'video' || hasImg);

                                    const bubbleStyle = {
                                        padding: isMediaOnly ? '4px' : '10px 14px',
                                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                        background: isVisualMedia
                                            ? (isMe ? 'rgba(19,104,236,0.10)' : 'rgba(255,255,255,0.10)')
                                            : (isMe ? 'linear-gradient(135deg, #1368EC 0%, #1d4ed8 100%)' : 'rgba(255,255,255,0.9)'),
                                        backdropFilter: isVisualMedia ? 'blur(14px)' : (isMe ? 'none' : 'blur(8px)'),
                                        border: isVisualMedia
                                            ? (isMe ? '1px solid rgba(19,104,236,0.28)' : '1px solid rgba(255,255,255,0.28)')
                                            : (isMe ? 'none' : '1px solid rgba(232,238,248,0.8)'),
                                        boxShadow: isVisualMedia
                                            ? (isMe
                                                ? '0 8px 32px rgba(19,104,236,0.22), inset 0 1px 0 rgba(255,255,255,0.10)'
                                                : '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.25)')
                                            : (isMe ? '0 4px 16px rgba(19,104,236,0.3)' : '0 2px 8px rgba(0,0,0,0.06)'),
                                        color: isMe ? '#fff' : '#1f2937',
                                        fontSize: '14px',
                                        lineHeight: '1.55',
                                        cursor: 'context-menu',
                                        position: 'relative',
                                        animation: 'msBubbleIn 0.22s cubic-bezier(.34,1.4,.64,1)',
                                    };
                                    return (
                                        <div style={bubbleStyle}>
                                            {msg.fileTransfer?.fileName && (() => {
                                                const cat = getFileCategory(msg.fileTransfer.fileType, msg.fileTransfer.fileName);
                                                const imgIdx = cat === 'image' ? (msgImageIndexMap[msg._id || index] ?? -1) : -1;
                                                return (
                                                    <div style={{ marginBottom: msg.text ? '8px' : 0 }}>
                                                        <FileBubble
                                                            fileTransfer={msg.fileTransfer}
                                                            isMe={isMe}
                                                            isP2P={!!msg.isP2P}
                                                            allImages={cat === 'image' ? allConvImages : undefined}
                                                            imageIndex={cat === 'image' ? imgIdx : 0}
                                                        />
                                                    </div>
                                                );
                                            })()}
                                            {msg.image && !msg.fileTransfer && (() => {
                                                const imgIdx = msgImageIndexMap[msg._id || index] ?? -1;
                                                return (
                                                    <div style={{ marginBottom: msg.text ? '8px' : 0 }}>
                                                        <FileBubble
                                                            fileTransfer={{ fileName: 'image.jpg', fileType: 'image/jpeg', mediaUrl: msg.image }}
                                                            isMe={isMe}
                                                            isP2P={!!msg.isP2P}
                                                            allImages={allConvImages}
                                                            imageIndex={imgIdx}
                                                        />
                                                    </div>
                                                );
                                            })()}
                                            {msg.text && <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</p>}
                                            {msg.isP2P && (
                                                <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#22c55e', color: '#fff', fontSize: '8px', padding: '2px 4px', borderRadius: '4px', fontWeight: '800', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>P2P</div>
                                            )}
                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                                                gap: '3px', marginTop: '4px',
                                                ...(isMediaOnly ? {
                                                    position: 'absolute', bottom: '8px', right: '10px',
                                                    background: 'rgba(0,0,0,0.45)', borderRadius: '10px',
                                                    padding: '2px 6px', backdropFilter: 'blur(4px)'
                                                } : {})
                                            }}>
                                                <span style={{ fontSize: '10px', opacity: isMediaOnly ? 1 : 0.7, color: isMediaOnly ? '#fff' : 'inherit' }}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <MessageTicks status={msg.status || 'sent'} isMe={isMe} />
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    );
                })}

                {isTyping && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px' }}>
                        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.9)', borderRadius: '18px 18px 18px 4px', display: 'flex', gap: '5px', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8eef8' }}>
                            {[0, 1, 2].map(i => (
                                <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#94a3b8', animation: `msTypingDot 1.2s ${i * 0.2}s infinite` }} />
                            ))}
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} style={{ background: 'none', borderTop: '1px solid #e8eef8', padding: '12px 16px', flexShrink: 0, borderRadius: '20px', borderBottomRightRadius: '0px', borderBottomLeftRadius: '0px' }}>
                {!canSendMessage && (
                    <div style={{ padding: '8px 14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', marginBottom: '10px', fontSize: '12px', color: '#92400e', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Only group admins can send messages
                    </div>
                )}
                {files.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px', padding: '10px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e8eef8' }}>
                        {files.map((file, i) => {
                            const cat = getFileCategory(file.type, file.name);
                            const fm = FILE_META[cat] || FILE_META.other;
                            return (
                                <div key={i} title={file.name} style={{ position: 'relative', borderRadius: '10px', border: `1px solid ${fm.border}`, background: fm.bg, display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px 6px 6px', maxWidth: '160px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: fm.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {cat === 'image' ? <img src={URL.createObjectURL(file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '9px', fontWeight: '900', color: '#fff' }}>{file.name.split('.').pop().toUpperCase().slice(0, 4)}</span>}
                                    </div>
                                    <div style={{ overflow: 'hidden', flex: 1 }}>
                                        <p style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                                        <p style={{ margin: 0, fontSize: '10px', color: fm.color, fontWeight: '600' }}>{formatSize(file.size)}</p>
                                    </div>
                                    <button type="button" onClick={() => removeFile(i)} style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '50%', width: '16px', height: '16px', cursor: 'pointer', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', backgroundColor: 'none' }}>
                    <button type="button" onClick={() => canSendMessage && fileInputRef.current.click()} disabled={!canSendMessage}
                        style={{ background: 'none', border: 'none', padding: '11px 11px', cursor: canSendMessage ? 'pointer' : 'not-allowed', borderRadius: '12px', color: canSendMessage ? '#64748b' : '#46de5aff', transition: 'all 0.2s', flexShrink: 0 }}
                        onMouseOver={e => { if (canSendMessage) e.currentTarget.style.background = '#e8eef8'; }}
                        onMouseOut={e => { if (canSendMessage) e.currentTarget.style.background = 'none'; }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <input type="file" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />

                    <textarea
                        ref={textareaRef}
                        style={{
                            flex: 1, padding: '11px 16px', border: '1px solid #e8eef8',
                            borderRadius: '16px', fontSize: '14px', outline: 'none',
                            color: '#0f172a', background: '#fafbff', resize: 'none',
                            minHeight: '44px', maxHeight: '100px', fontFamily: 'inherit',
                            transition: 'border-color 0.2s', overflowY: 'auto', scrollbarWidth: 'none',
                            lineHeight: '1.5',
                        }}
                        placeholder={canSendMessage ? 'Type a message...' : 'Only admins can send messages...'}
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                        rows={1}
                        disabled={!canSendMessage}
                        onFocus={e => e.target.style.borderColor = '#1368EC'}
                        onBlur={e => e.target.style.borderColor = '#e8eef8'}
                    />

                    <button type="submit"
                        style={{
                            background: (!newMessage.trim() && files.length === 0) || sending || !canSendMessage
                                ? '#e8eef8' : 'linear-gradient(135deg, #1368EC, #2563eb)',
                            color: (!newMessage.trim() && files.length === 0) || sending || !canSendMessage ? '#94a3b8' : '#fff',
                            border: 'none', borderRadius: '50%', width: '44px', height: '44px',
                            cursor: ((!newMessage.trim() && files.length === 0) || sending || !canSendMessage) ? 'not-allowed' : 'pointer',
                            fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, boxShadow: (!newMessage.trim() && files.length === 0) || sending || !canSendMessage ? 'none' : '0 4px 14px rgba(19,104,236,0.35)',
                            transition: 'all 0.2s'
                        }}
                        disabled={sending || (!newMessage.trim() && files.length === 0) || !canSendMessage}
                    >
                        {sending
                            ? <div style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'msSpin 1s linear infinite' }} />
                            : (useP2P ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ))
                        }
                    </button>
                </div>
            </form>

            {
                contextMenu && (
                    <ChatContextMenu
                        x={contextMenu.x} y={contextMenu.y} isMe={contextMenu.isMe}
                        onDeleteForMe={() => deleteMessage(contextMenu.messageId, 'forMe')}
                        onDeleteForEveryone={() => deleteMessage(contextMenu.messageId, 'forEveryone')}
                        onClose={() => setContextMenu(null)}
                    />
                )
            }

            {
                confirmDialog && (
                    <ConfirmDialog
                        title={confirmDialog.title} body={confirmDialog.body}
                        confirmText={confirmDialog.confirmText || 'Delete'}
                        confirmStyle={confirmDialog.confirmStyle || "danger"}
                        onConfirm={confirmDialog.onConfirm}
                        onCancel={confirmDialog.onCancel || (() => setConfirmDialog(null))}
                    />
                )
            }

            <style>{`
                @keyframes msSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes msTypingDot {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-6px); }
                }
                @keyframes msCtxIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes msFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes msModalPop {
                    from { opacity: 0; transform: scale(0.88); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes msBubbleIn {
                    from { opacity: 0; transform: translateY(6px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default MessageArea;
