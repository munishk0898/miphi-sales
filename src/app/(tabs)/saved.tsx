import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { FileRow } from '../../components/FileRow';
import { LIBRARY } from '../../config';
import { listSaved, subscribeSaved, type SavedEntry } from '../../lib/files';
import { useFileActions } from '../../lib/useFileActions';
import { colors } from '../../theme';

export default function Saved() {
  const [entries, setEntries] = useState<SavedEntry[] | null>(null);
  const actions = useFileActions();

  useEffect(() => {
    const load = () => listSaved().then(setEntries);
    load();
    return subscribeSaved(load);
  }, []);

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{ paddingVertical: 12 }}
      data={entries ?? []}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={
        entries && entries.length > 0 ? (
          <Text style={styles.hint}>Files saved on this phone. They open without internet.</Text>
        ) : null
      }
      renderItem={({ item }) => (
        <View>
          {item.section ? <Text style={styles.section}>{LIBRARY[item.section]?.title}</Text> : null}
          <FileRow
            item={item}
            saved
            progress={actions.progress[item.id]}
            onOpen={actions.open}
            onDownload={actions.download}
          />
        </View>
      )}
      ListEmptyComponent={
        entries ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-download-outline" size={44} color={colors.faint} />
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptyText}>
              Tap the download icon next to any brochure, AVL or deck to keep it on your phone for offline use.
            </Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  hint: { color: colors.muted, fontSize: 13, marginHorizontal: 16, marginBottom: 10 },
  section: { fontSize: 11, fontWeight: '700', color: colors.orange, marginLeft: 18, marginBottom: 3, letterSpacing: 0.5 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 36 },
  emptyTitle: { marginTop: 12, fontSize: 17, fontWeight: '700', color: colors.ink },
  emptyText: { marginTop: 6, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
