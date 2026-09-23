import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAccessToken, SessionExpiredError } from './auth';

const GRAPH = 'https://graph.microsoft.com/v1.0';

export type DriveItem = {
  id: string;
  driveId: string;
  name: string;
  size: number;
  isFolder: boolean;
  childCount?: number;
  mimeType?: string;
  createdAt: string;
  modifiedAt: string;
  eTag: string;
  webUrl?: string;
};

export class GraphError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function friendlyMessage(status: number, body: any): string {
  const code = body?.error?.code || '';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403 || code === 'accessDenied')
    return 'You do not have access to this folder. Ask the content owner to share it with you.';
  if (status === 404 || code === 'itemNotFound') return 'This folder or file was moved or is no longer shared.';
  if (status === 429 || status === 503) return 'OneDrive is busy. Please try again in a moment.';
  return body?.error?.message || `OneDrive request failed (${status}).`;
}

/** GET-only Graph helper. The app never sends write requests. */
export async function graphGet<T = any>(pathOrUrl: string, extraHeaders: Record<string, string> = {}): Promise<T> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : GRAPH + pathOrUrl;
  let token = await getAccessToken();
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}`, ...extraHeaders } });
    if (res.status === 401) {
      token = await getAccessToken(true);
      res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}`, ...extraHeaders } });
    }
  } catch (e) {
    if (e instanceof SessionExpiredError) throw e;
    throw new GraphError(0, 'No internet connection. Showing the last loaded list.');
  }
  if (!res.ok) {
    let body: any = null;
    try {
      body = await res.json();
    } catch {}
    throw new GraphError(res.status, friendlyMessage(res.status, body));
  }
  return res.json();
}

function toItem(raw: any, fallbackDriveId?: string): DriveItem {
  return {
    id: raw.id,
    driveId: raw.parentReference?.driveId || fallbackDriveId || '',
    name: raw.name,
    size: raw.size ?? 0,
    isFolder: !!raw.folder,
    childCount: raw.folder?.childCount,
    mimeType: raw.file?.mimeType,
    createdAt: raw.createdDateTime,
    modifiedAt: raw.lastModifiedDateTime,
    eTag: raw.eTag || raw.cTag || raw.lastModifiedDateTime,
    webUrl: raw.webUrl,
  };
}

/** Encodes a sharing URL into a Graph share id ("u!" + unpadded base64url). */
export function encodeShareUrl(url: string): string {
  // Sharing links are plain ASCII, so btoa is safe here.
  const b64 = btoa(url.trim());
  return 'u!' + b64.replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-');
}

const shareCache: Record<string, DriveItem> = {};

/** Resolves a OneDrive/SharePoint sharing link to its drive item. */
export async function resolveShare(shareUrl: string): Promise<DriveItem> {
  if (shareCache[shareUrl]) return shareCache[shareUrl];
  const key = 'share:' + shareUrl;
  try {
    const raw = await graphGet(`/shares/${encodeShareUrl(shareUrl)}/driveItem`, {
      // Grants the signed-in user lasting (read) access through the link so sub-folders can be browsed.
      Prefer: 'redeemSharingLink',
    });
    const item = toItem(raw);
    shareCache[shareUrl] = item;
    AsyncStorage.setItem(key, JSON.stringify(item)).catch(() => {});
    return item;
  } catch (e) {
    const cached = await AsyncStorage.getItem(key);
    if (cached && e instanceof GraphError && e.status === 0) return JSON.parse(cached);
    throw e;
  }
}

/** Lists a folder, following pagination. */
export async function listChildren(driveId: string, itemId: string): Promise<DriveItem[]> {
  let url: string | null = `/drives/${driveId}/items/${itemId}/children?$top=200`;
  const out: DriveItem[] = [];
  while (url) {
    const page: any = await graphGet(url);
    for (const raw of page.value || []) {
      // Skip OneNote notebooks and other non-file packages.
      if (raw.package && !raw.folder) continue;
      out.push(toItem(raw, driveId));
    }
    url = page['@odata.nextLink'] || null;
  }
  return out;
}

export async function getItem(driveId: string, itemId: string): Promise<{ item: DriveItem; downloadUrl?: string }> {
  const raw = await graphGet(`/drives/${driveId}/items/${itemId}`);
  return { item: toItem(raw, driveId), downloadUrl: raw['@microsoft.graph.downloadUrl'] };
}

export function pdfConversionUrl(driveId: string, itemId: string) {
  return `${GRAPH}/drives/${driveId}/items/${itemId}/content?format=pdf`;
}

/* ---------- Offline list cache, so the last loaded list shows instantly and without network ---------- */

const listKey = (driveId: string, itemId: string) => `list:${driveId}:${itemId}`;

export async function getCachedList(driveId: string, itemId: string): Promise<DriveItem[] | null> {
  const s = await AsyncStorage.getItem(listKey(driveId, itemId));
  return s ? JSON.parse(s) : null;
}

export async function setCachedList(driveId: string, itemId: string, items: DriveItem[]) {
  await AsyncStorage.setItem(listKey(driveId, itemId), JSON.stringify(items));
}
