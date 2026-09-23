import { Ionicons } from '@expo/vector-icons';
import type { File } from 'expo-file-system';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { DocViewer } from '../components/DocViewer';
import type { SectionKey } from '../config';
import { SessionExpiredError } from '../lib/auth';
import { ensureViewable } from '../lib/files';
import { formatDate, formatSize, viewModeOf } from '../lib/format';
import type { DriveItem } from '../lib/graph';
import { useFileActions } from '../lib/useFileActions';
import { colors, radius } from '../theme';

export default function Viewer() {
  const params = useLocalSearchParams<{ item: string; section: SectionKey }>();
  const item = useMemo<DriveItem>(() => JSON.parse(params.item), [params.item]);
  const mode = viewModeOf(item.name);
  const actions = useFileActions(params.section || undefined);

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (mode === 'none') return;
    let alive = true;
    setError(null);
    setFile(null);
    ensureViewable(item, (f) => alive && setProgress(f))
      .then((f) => alive && setFile(f))
      .catch((e) => {
        if (!alive || e instanceof SessionExpiredError) return;
        setError(String(e?.message || e));
      });
    return () => {
      alive = false;
    };
  }, [item, mode, attempt]);

  const busy = actions.progress[item.id] != null;
  const saved = actions.saved[item.id];

  const headerRight = useCallback(
    () => (
      <View style={styles.headerBtns}>
        <Pressable hitSlop={8} onPress={() => actions.download(item)} disabled={busy} accessibilityLabel="Download">
          {busy ? (
            <ActivityIndicator color={colors.orange} />
          ) : (
            <Ionicons
              name={saved && saved.eTag === item.eTag ? 'checkmark-circle' : 'download-outline'}
              size={24}
              color={saved && saved.eTag === item.eTag ? colors.success : colors.ink}
            />
          )}
        </Pressable>
        <Pressable hitSlop={8} onPress={() => actions.share(item)} disabled={busy} style={{ marginLeft: 20 }} accessibilityLabel="Share">
          <Ionicons name="share-outline" size={24} color={colors.ink} />
        </Pressable>
      </View>
    ),
    [actions, item, busy, saved],
  );

  return (
    <View style={styles.fill}>
      <Stack.Screen options={{ title: item.name, headerRight, headerTitleStyle: { fontSize: 15, fontWeight: '700' } }} />

      {mode === 'none' ? (
        <View style={styles.center}>
          <Ionicons name="document-outline" size={48} color={colors.faint} />
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.meta}>
            {[formatSize(item.size), formatDate(item.modifiedAt)].filter(Boolean).join('  ·  ')}
          </Text>
          <Text style={styles.msg}>This file type cannot be previewed in the app. Share it to open in another app.</Text>
          <Pressable style={styles.btn} onPress={() => actions.share(item)}>
            <Ionicons name="share-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Share or open in…</Text>
          </Pressable>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color={colors.danger} />
          <Text style={styles.msg}>{error}</Text>
          <Pressable style={styles.btn} onPress={() => setAttempt((a) => a + 1)}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.btnText}>Try again</Text>
          </Pressable>
        </View>
      ) : !file ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.orange} />
          <Text style={styles.msg}>
            {mode === 'convert' ? 'Preparing preview…' : 'Loading…'}
            {progress > 0 ? `  ${Math.round(progress * 100)}%` : ''}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fillBar, { width: `${Math.max(3, Math.round(progress * 100))}%` }]} />
          </View>
        </View>
      ) : (
        <DocViewer file={file} kind={mode === 'image' ? 'image' : 'pdf'} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#E9E9EB' },
  headerBtns: { flexDirection: 'row', alignItems: 'center', marginRight: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 12, textAlign: 'center' },
  meta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  msg: { marginTop: 14, color: colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  btn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orange,
    paddingHorizontal: 20,
    height: 46,
    borderRadius: radius.md,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 8 },
  track: { width: 200, height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 14, overflow: 'hidden' },
  fillBar: { height: 4, backgroundColor: colors.orange },
});
