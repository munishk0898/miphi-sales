import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../lib/auth';
import { clearSaved, listSaved, savedBytes } from '../lib/files';
import { formatSize } from '../lib/format';
import { colors, radius } from '../theme';

export default function Settings() {
  const { user, signOut } = useAuth();
  const [savedInfo, setSavedInfo] = useState({ count: 0, bytes: 0 });

  const refresh = () => listSaved().then((l) => setSavedInfo({ count: l.length, bytes: savedBytes(l) }));
  useEffect(() => {
    refresh();
  }, []);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name || '?').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.name || 'Signed in'}</Text>
          {user?.email ? <Text style={styles.sub}>{user.email}</Text> : null}
        </View>
      </View>

      <View style={styles.card}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.orange} />
        <Text style={[styles.sub, { flex: 1, marginLeft: 12 }]}>
          Read only. The app can view, download and share files, but it cannot change or delete anything in OneDrive.
        </Text>
      </View>

      <Pressable
        style={styles.row}
        onPress={() =>
          Alert.alert(
            'Remove downloads from this phone?',
            'This only clears copies saved on this phone. Files in OneDrive are not affected.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => clearSaved().then(refresh) },
            ],
          )
        }>
        <Ionicons name="phone-portrait-outline" size={20} color={colors.ink} />
        <Text style={styles.rowText}>Clear downloads on this phone</Text>
        <Text style={styles.rowValue}>
          {savedInfo.count} file{savedInfo.count === 1 ? '' : 's'}
          {savedInfo.bytes ? `, ${formatSize(savedInfo.bytes)}` : ''}
        </Text>
      </Pressable>

      <Pressable
        style={styles.row}
        onPress={() =>
          Alert.alert('Sign out?', 'Files saved on this phone stay available after you sign in again.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: signOut },
          ])
        }>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={[styles.rowText, { color: colors.danger }]}>Sign out</Text>
      </Pressable>

      <Text style={styles.version}>MiPhi Sales {Constants.expoConfig?.version ?? ''}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  name: { fontSize: 17, fontWeight: '700', color: colors.ink },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 19 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowText: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600', color: colors.ink },
  rowValue: { fontSize: 13, color: colors.muted },
  version: { textAlign: 'center', color: colors.faint, fontSize: 12, marginTop: 20 },
});
