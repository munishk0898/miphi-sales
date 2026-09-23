import { NEW_BADGE_DAYS } from '../config';

export type FileKind = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'image' | 'text' | 'other';

export function extOf(name: string) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function kindOf(name: string): FileKind {
  const e = extOf(name);
  if (e === 'pdf') return 'pdf';
  if (['doc', 'docx', 'odt', 'rtf'].includes(e)) return 'word';
  if (['xls', 'xlsx', 'xlsm', 'ods', 'csv'].includes(e)) return 'excel';
  if (['ppt', 'pptx', 'pps', 'ppsx', 'odp'].includes(e)) return 'powerpoint';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic'].includes(e)) return 'image';
  if (['txt', 'md'].includes(e)) return 'text';
  return 'other';
}

/** Microsoft Graph can convert these formats to PDF for in-app viewing. */
const CONVERTIBLE = new Set([
  'doc', 'docx', 'odt', 'rtf', 'xls', 'xlsx', 'xlsm', 'ods', 'ppt', 'pptx', 'pps', 'ppsx', 'odp',
  'htm', 'html', 'md', 'eml', 'msg', 'tif', 'tiff',
]);

export type ViewMode = 'pdf' | 'convert' | 'image' | 'none';

export function viewModeOf(name: string): ViewMode {
  const e = extOf(name);
  if (e === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(e)) return 'image';
  if (CONVERTIBLE.has(e)) return 'convert';
  return 'none';
}

export const kindStyle: Record<FileKind, { icon: string; color: string; label: string }> = {
  pdf: { icon: 'document-text', color: '#D93025', label: 'PDF' },
  word: { icon: 'document-text', color: '#2B579A', label: 'DOC' },
  excel: { icon: 'grid', color: '#217346', label: 'XLS' },
  powerpoint: { icon: 'easel', color: '#C43E1C', label: 'PPT' },
  image: { icon: 'image', color: '#7B5EA7', label: 'IMG' },
  text: { icon: 'document', color: '#6B6667', label: 'TXT' },
  other: { icon: 'document', color: '#6B6667', label: 'FILE' },
};

export function formatSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function isNew(createdAt: string) {
  const t = new Date(createdAt).getTime();
  return !isNaN(t) && Date.now() - t < NEW_BADGE_DAYS * 86400_000;
}

export function mimeFor(name: string, fallback?: string) {
  const e = extOf(name);
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    csv: 'text/csv',
    txt: 'text/plain',
    zip: 'application/zip',
  };
  return map[e] || fallback || 'application/octet-stream';
}

export function utiFor(name: string) {
  const e = extOf(name);
  const map: Record<string, string> = {
    pdf: 'com.adobe.pdf',
    docx: 'org.openxmlformats.wordprocessingml.document',
    xlsx: 'org.openxmlformats.spreadsheetml.sheet',
    pptx: 'org.openxmlformats.presentationml.presentation',
    png: 'public.png',
    jpg: 'public.jpeg',
    jpeg: 'public.jpeg',
  };
  return map[e] || 'public.data';
}

/** Keeps the original file name but strips characters that are unsafe in file paths. */
export function safeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim() || 'file';
}

export function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
