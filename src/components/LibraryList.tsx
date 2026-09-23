import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { LIBRARY, type SectionKey } from '../config';
import { SessionExpiredError } from '../lib/auth';
import {
  getCachedList,
  GraphError,
  listChildren,
  resolveShare,
  setCachedList,
  type DriveItem,
} from '../lib/graph';
import { useFileActions } from '../lib/useFileActions';
import { colors, radius } from '../theme';
import { FileRow } from './FileRow';

type Props = {
  section: SectionKey;
  /** Omit for the section's root (resolved from its sharing link). */
  folder?: { driveId: string; itemId: string };
};

type Sort = 'newest' | 'name';

const STALE_MS = 60_000;

export function LibraryList({ section, folder }: Props) {
  const [items, setItems] = useState<DriveItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const lastLoad = useRef(0);
  const target = useRef<{ driveId: string; itemId: string; single?: DriveItem } | null>(folder ?? null);
  const actions = useFileActions(section);

  const load = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      try {
        if (!target.current) {
          const root = await resolveShare(LIBRARY[section].shareUrl);
          target.current = root.isFolder
            ? { driveId: root.driveId, itemId: root.id }
            : { driveId: root.driveId, itemId: root.id, single: root };
        }
        const t = target.current;
        if (!items) {
          const cached = await getCachedList(t.driveId, t.itemId);
          if (cached) setItems(cached);
        }
        const fresh = t.single ? [t.single] : await listChildren(t.driveId, t.itemId);
        if (t.single) target.current = null; // re-resolve next time to pick up a new version
        setItems(fresh);
        setError(null);
        lastLoad.current = Date.now();
        setCachedList(t.driveId, t.itemId, fresh).catch(() => {});
      } catch (e: any) {
        if (e instanceof SessionExpiredError) return; // the auth layer sends the user to sign in
        setError(e instanceof GraphError ? e.message : String(e?.message || e));
        setItems((prev) => prev ?? []);
      } finally {
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [section, folder?.driveId, folder?.itemId],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Pick up newly added files whenever the screen comes back into view or the app returns to the foreground.
  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastLoad.current > STALE_MS) load();
    }, [load]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && Date.now() - lastLoad.current > STALE_MS) load();
    });
    return () => sub.remove();
  }, [load]);

  const data = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    const filtered = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
    return [...filtered].sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      if (sort === 'name') return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      return b.modifiedAt.localeCompare(a.modifiedAt);
    });
  }, [items, query, sort]);

  const header = (
    <View>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={17} color={colors.faint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${folder ? 'this folder' : LIBRARY[section].title.toLowerCase()}`}
            placeholderTextColor={colors.faint}
            style={styles.searchInput}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
        <Pressable
          onPress={() => setSort((s) => (s === 'newest' ? 'name' : 'newest'))}
          style={styles.sortBtn}
          accessibilityLabel="Change sort order">
          <Ionicons name={sort === 'newest' ? 'time-outline' : 'text-outline'} size={16} color={colors.ink} />
          <Text style={styles.sortText}>{sort === 'newest' ? 'Newest' : 'A to Z'}</Text>
        </Pressable>
      </View>
      {error && (
        <View style={styles.banner}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.danger} />
          <Text style={styles.bannerText}>{error}</Text>
        </View>
      )}
    </View>
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{ paddingBottom: 24 }}
      data={data}
      keyExtractor={(i) => i.id}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.orange} colors={[colors.orange]} />}
      renderItem={({ item }) => {
        const s = actions.saved[item.id];
        return (
          <FileRow
            item={item}
            saved={!!s}
            outdated={!!s && s.eTag !== item.eTag}
            progress={actions.progress[item.id]}
            onOpen={actions.open}
            onDownload={actions.download}
          />
        );
      }}
      ListEmptyComponent={
        items === null ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Loading files…</Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={40} color={colors.faint} />
            <Text style={styles.emptyText}>{query ? 'No files match your search.' : 'No files here yet.'}</Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10 },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: colors.text, paddingVertical: 0 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sortText: { marginLeft: 5, fontSize: 13, fontWeight: '600', color: colors.ink },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: '#FDECEA',
  },
  bannerText: { marginLeft: 8, color: colors.danger, fontSize: 13, flex: 1 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyText: { marginTop: 10, color: colors.muted, fontSize: 15, textAlign: 'center' },
});
