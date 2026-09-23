import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import type { SectionKey } from '../config';
import { listSaved, saveOffline, saveToPhoneFolder, shareItem, subscribeSaved, type SavedEntry } from './files';
import type { DriveItem } from './graph';

/** Shared open / download / share behaviour for every file list. */
export function useFileActions(section?: SectionKey) {
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<Record<string, SavedEntry>>({});

  useEffect(() => {
    const load = () =>
      listSaved().then((list) => setSaved(Object.fromEntries(list.map((e) => [e.id, e]))));
    load();
    return subscribeSaved(load);
  }, []);

  const setP = (id: string, v: number | null) =>
    setProgress((p) => {
      const n = { ...p };
      if (v == null) delete n[id];
      else n[id] = v;
      return n;
    });

  const open = useCallback(
    (item: DriveItem) => {
      if (item.isFolder) {
        router.push({
          pathname: '/folder',
          params: { driveId: item.driveId, itemId: item.id, title: item.name, section: section ?? '' },
        });
        return;
      }
      router.push({ pathname: '/viewer', params: { item: JSON.stringify(item), section: section ?? '' } });
    },
    [section],
  );

  const run = useCallback(async (item: DriveItem, task: (onP: (f: number) => void) => Promise<unknown>) => {
    setP(item.id, 0);
    try {
      await task((f) => setP(item.id, f));
    } catch (e: any) {
      if (!/cancel/i.test(String(e?.message))) Alert.alert('Could not complete', String(e?.message || e));
    } finally {
      setP(item.id, null);
    }
  }, []);

  const share = useCallback((item: DriveItem) => run(item, (onP) => shareItem(item, onP)), [run]);

  const saveToPhone = useCallback(
    (item: DriveItem) =>
      run(item, async (onP) => {
        const out = await saveToPhoneFolder(item, onP);
        if (out && Platform.OS === 'android') Alert.alert('Saved', `${item.name} was saved to the folder you picked.`);
      }),
    [run],
  );

  const afterSaveOptions = useCallback(
    (item: DriveItem, title: string, message: string, extra: { text: string; onPress: () => void }[] = []) => {
      Alert.alert(title, message, [
        { text: 'Share', onPress: () => share(item) },
        ...(Platform.OS === 'android' ? [{ text: 'Save to phone folder', onPress: () => saveToPhone(item) }] : []),
        ...extra,
        { text: 'Close', style: 'cancel' as const },
      ]);
    },
    [share, saveToPhone],
  );

  const download = useCallback(
    (item: DriveItem) => {
      const existing = saved[item.id];
      if (existing && existing.eTag === item.eTag) {
        afterSaveOptions(item, 'Available offline', `${item.name} is saved in the app. Open it any time from the Saved tab.`);
        return;
      }
      run(item, async (onP) => {
        await saveOffline(item, section, onP);
        afterSaveOptions(
          item,
          existing ? 'Updated' : 'Downloaded',
          `${item.name} is saved in the app and works without internet (Saved tab).` +
            (Platform.OS === 'ios' ? ' Use Share, then "Save to Files" to keep a copy in the Files app.' : ''),
        );
      });
    },
    [saved, run, section, afterSaveOptions],
  );

  return { progress, saved, open, download, share, saveToPhone };
}
