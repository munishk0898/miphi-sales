import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { SectionKey } from '../config';
import { getAccessToken } from './auth';
import { mimeFor, safeFileName, utiFor, viewModeOf, hash } from './format';
import { getItem, pdfConversionUrl, type DriveItem } from './graph';

/**
 * Local copies only. Nothing here ever changes or deletes anything in OneDrive.
 * - Saved (offline) copies: Documents/saved/<itemId>/<original name>
 * - Temporary viewing copies: Caches/view/<itemId>/<version>/<name>
 */

export type SavedEntry = DriveItem & { localUri: string; previewUri?: string; savedAt: string; section?: SectionKey };

const INDEX_KEY = 'saved-index-v1';
const savedRoot = () => new Directory(Paths.document, 'saved');
const viewRoot = () => new Directory(Paths.cache, 'view');

type Progress = (fraction: number) => void;

/* ---------------- saved index ---------------- */

let index: Record<string, SavedEntry> | null = null;
const listeners = new Set<() => void>();

async function loadIndex() {
  if (index) return index;
  try {
    index = JSON.parse((await AsyncStorage.getItem(INDEX_KEY)) || '{}');
  } catch {
    index = {};
  }
  // Drop entries whose file was removed by the OS.
  for (const [id, e] of Object.entries(index!)) {
    if (!new File(e.localUri).exists) delete index![id];
  }
  return index!;
}

async function persist() {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index || {}));
  listeners.forEach((l) => l());
}

export function subscribeSaved(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export async function listSaved(): Promise<SavedEntry[]> {
  const i = await loadIndex();
  return Object.values(i).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function getSaved(itemId: string): Promise<SavedEntry | undefined> {
  return (await loadIndex())[itemId];
}

/* ---------------- downloads ---------------- */

function ensureDir(dir: Directory) {
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

async function download(url: string, dest: File, onProgress?: Progress, headers?: Record<string, string>) {
  if (dest.exists) dest.delete();
  const out = await File.downloadFileAsync(url, dest, {
    headers,
    idempotent: true,
    onProgress: onProgress
      ? (p) => {
          if (p.totalBytes > 0) onProgress(Math.min(1, p.bytesWritten / p.totalBytes));
        }
      : undefined,
  });
  return out;
}

async function freshDownloadUrl(item: DriveItem) {
  const { downloadUrl } = await getItem(item.driveId, item.id);
  if (!downloadUrl) throw new Error('This file cannot be downloaded.');
  return downloadUrl;
}

async function downloadConvertedPdf(item: DriveItem, dest: File, onProgress?: Progress) {
  const token = await getAccessToken();
  return download(pdfConversionUrl(item.driveId, item.id), dest, onProgress, { Authorization: `Bearer ${token}` });
}

const pdfNameFor = (name: string) => safeFileName(name.replace(/\.[^.]+$/, '')) + '.pdf';

/** Saves the original file on the phone for offline use. */
export async function saveOffline(item: DriveItem, section?: SectionKey, onProgress?: Progress): Promise<SavedEntry> {
  const i = await loadIndex();
  const dir = new Directory(savedRoot(), item.id);
  if (dir.exists) dir.delete();
  ensureDir(dir);
  const file = new File(dir, safeFileName(item.name));
  const url = await freshDownloadUrl(item);
  const convert = viewModeOf(item.name) === 'convert';
  await download(url, file, (f) => onProgress?.(convert ? f * 0.7 : f));

  let previewUri: string | undefined;
  if (convert) {
    // Keep a PDF rendition too, so Office files can be viewed offline.
    try {
      const prev = new File(dir, '__preview__' + pdfNameFor(item.name));
      await downloadConvertedPdf(item, prev, (f) => onProgress?.(0.7 + f * 0.3));
      previewUri = prev.uri;
    } catch {}
  }
  const entry: SavedEntry = { ...item, localUri: file.uri, previewUri, savedAt: new Date().toISOString(), section };
  i[item.id] = entry;
  await persist();
  return entry;
}

export async function clearSaved() {
  const root = savedRoot();
  if (root.exists) root.delete();
  const v = viewRoot();
  if (v.exists) v.delete();
  index = {};
  await persist();
}

export function savedBytes(entries: SavedEntry[]) {
  return entries.reduce((n, e) => n + (e.size || 0), 0);
}

function viewDir(item: DriveItem) {
  return ensureDir(new Directory(viewRoot(), item.id, hash(item.eTag || item.modifiedAt)));
}

/** Local copy of the original file (saved copy if it is current, else a temporary copy). */
export async function ensureOriginal(item: DriveItem, onProgress?: Progress): Promise<File> {
  const saved = await getSaved(item.id);
  if (saved && saved.eTag === item.eTag && new File(saved.localUri).exists) return new File(saved.localUri);
  const file = new File(viewDir(item), safeFileName(item.name));
  if (file.exists && file.size > 0) return file;
  try {
    return await download(await freshDownloadUrl(item), file, onProgress);
  } catch (e) {
    // Offline: fall back to an older saved copy if there is one.
    if (saved && new File(saved.localUri).exists) return new File(saved.localUri);
    throw e;
  }
}

/** Local file ready for the viewer: a PDF (original or converted) or an image. */
export async function ensureViewable(item: DriveItem, onProgress?: Progress): Promise<File> {
  const mode = viewModeOf(item.name);
  if (mode === 'pdf' || mode === 'image') return ensureOriginal(item, onProgress);
  if (mode === 'convert') {
    const saved = await getSaved(item.id);
    const savedPreview = saved?.previewUri ? new File(saved.previewUri) : null;
    if (saved && saved.eTag === item.eTag && savedPreview?.exists) return savedPreview;
    const file = new File(viewDir(item), pdfNameFor(item.name));
    if (file.exists && file.size > 0) return file;
    try {
      return await downloadConvertedPdf(item, file, onProgress);
    } catch (e) {
      if (savedPreview?.exists) return savedPreview;
      throw e;
    }
  }
  throw new Error('This file type cannot be previewed. Use Share to open it in another app.');
}

/** Opens the system share sheet (WhatsApp, Mail, Teams, Save to Files, and so on). */
export async function shareItem(item: DriveItem, onProgress?: Progress) {
  const file = await ensureOriginal(item, onProgress);
  await Sharing.shareAsync(file.uri, {
    mimeType: mimeFor(item.name, item.mimeType),
    UTI: utiFor(item.name),
    dialogTitle: item.name,
  });
}

/** Android only: lets the user pick a phone folder (for example Downloads) and copies the file there. */
export async function saveToPhoneFolder(item: DriveItem, onProgress?: Progress) {
  if (Platform.OS !== 'android') return shareItem(item, onProgress);
  const src = await ensureOriginal(item, onProgress);
  const dir = await Directory.pickDirectoryAsync();
  const out = dir.createFile(item.name, mimeFor(item.name, item.mimeType));
  out.write(await src.bytes());
  return out;
}
