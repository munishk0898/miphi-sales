import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDate, formatSize, isNew, kindOf, kindStyle } from '../lib/format';
import type { DriveItem } from '../lib/graph';
import { colors, radius } from '../theme';

type Props = {
  item: DriveItem;
  saved?: boolean;
  outdated?: boolean;
  progress?: number; // 0..1 while downloading
  onOpen: (item: DriveItem) => void;
  onDownload?: (item: DriveItem) => void;
};

function FileRowBase({ item, saved, outdated, progress, onOpen, onDownload }: Props) {
  if (item.isFolder) {
    return (
      <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={() => onOpen(item)}>
        <View style={[styles.badge, { backgroundColor: colors.orangeTint }]}>
          <Ionicons name="folder" size={22} color={colors.orange} />
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.meta}>
            {item.childCount != null ? `${item.childCount} item${item.childCount === 1 ? '' : 's'}` : 'Folder'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.faint} />
      </Pressable>
    );
  }

  const k = kindStyle[kindOf(item.name)];
  const downloading = progress != null;
  const meta = [formatSize(item.size), formatDate(item.modifiedAt)].filter(Boolean).join('  ·  ');

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={() => onOpen(item)}
      accessibilityLabel={`Open ${item.name}`}>
      <View style={[styles.badge, { backgroundColor: k.color + '18' }]}>
        <Ionicons name={k.icon as any} size={20} color={k.color} />
        <Text style={[styles.badgeText, { color: k.color }]}>{k.label}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.metaRow}>
          {isNew(item.createdAt) && (
            <View style={styles.newPill}>
              <Text style={styles.newText}>NEW</Text>
            </View>
          )}
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        {downloading && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(4, Math.round((progress || 0) * 100))}%` }]} />
          </View>
        )}
      </View>

      <Pressable
        hitSlop={6}
        onPress={() => onOpen(item)}
        style={({ pressed }) => [styles.iconBtn, styles.eyeBtn, pressed && styles.iconPressed]}
        accessibilityLabel={`View ${item.name}`}>
        <Ionicons name="eye-outline" size={21} color={colors.orange} />
      </Pressable>

      {onDownload && (
        <Pressable
          hitSlop={6}
          disabled={downloading}
          onPress={() => onDownload(item)}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconPressed]}
          accessibilityLabel={saved ? `Share ${item.name}` : `Download ${item.name}`}>
          {downloading ? (
            <ActivityIndicator size="small" color={colors.orange} />
          ) : saved && !outdated ? (
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          ) : (
            <Ionicons name={outdated ? 'refresh-circle-outline' : 'download-outline'} size={22} color={colors.ink} />
          )}
        </Pressable>
      )}
    </Pressable>
  );
}

export const FileRow = memo(FileRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85 },
  badge: { width: 44, height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 9, fontWeight: '800', marginTop: 1, letterSpacing: 0.4 },
  body: { flex: 1, marginHorizontal: 12 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  meta: { fontSize: 12, color: colors.muted, flexShrink: 1 },
  newPill: { backgroundColor: colors.orange, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, marginRight: 6 },
  newText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  eyeBtn: { backgroundColor: colors.orangeTint, marginRight: 4 },
  iconPressed: { opacity: 0.6 },
  progressTrack: { height: 3, backgroundColor: colors.border, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: colors.orange },
});
