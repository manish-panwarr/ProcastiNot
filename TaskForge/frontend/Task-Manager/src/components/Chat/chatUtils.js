import { BASE_URL } from '../../utils/apiPaths';


// URL helpers

export const getFullUrl = (path) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${BASE_URL}${path}`;
};


// File utilities

//@desc : get file category from file type and file name
//@params : fileType, fileName
//@return : string
export const getFileCategory = (fileType = '', fileName = '') => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('audio/')) return 'audio';
    if (fileType.includes('pdf')) return 'pdf';
    if (fileType.includes('word') || /\.(doc|docx)$/i.test(fileName)) return 'word';
    if (fileType.includes('sheet') || fileType.includes('excel') || /\.(xls|xlsx|csv)$/i.test(fileName)) return 'excel';
    if (fileType.includes('presentation') || /\.(ppt|pptx)$/i.test(fileName)) return 'ppt';
    if (fileType.includes('zip') || fileType.includes('rar') || /\.(zip|rar|7z|gz|tar)$/i.test(fileName)) return 'archive';
    if (fileType.includes('text') || /\.(txt|md)$/i.test(fileName)) return 'text';
    return 'other';
};

//@desc : file metadata for each file category
//@params : none
//@return : object
export const FILE_META = {
    pdf: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'PDF' },
    word: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'DOCX' },
    excel: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'XLSX' },
    ppt: { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', label: 'PPTX' },
    archive: { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'ZIP' },
    text: { color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', label: 'TXT' },
    audio: { color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', label: 'Audio' },
    other: { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', label: 'File' },
};

//@desc : format a byte count into a human-readable string (B / KB / MB)
//@params : bytes
//@return : string
export const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};


// Text helpers
//@desc : truncate a string to at most `n` characters, appending an ellipsis when cut
//@params : str, n
//@return : string
export const truncateText = (str, n = 30) => {
    if (!str) return '';
    return str.length > n ? str.slice(0, n) + '…' : str;
};


// Date / time helpers
//@desc : format a date string for the conversation list
//@params : dateStr
//@return : string
export const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86_400_000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
};
