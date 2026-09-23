import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { Pressable, type ColorValue } from 'react-native';

import { LogoTitle } from '../../components/LogoTitle';
import { colors } from '../../theme';

function AccountButton() {
  return (
    <Pressable onPress={() => router.push('/settings')} hitSlop={10} style={{ marginRight: 16 }} accessibilityLabel="Account">
      <Ionicons name="person-circle-outline" size={28} color={colors.ink} />
    </Pressable>
  );
}

const icon =
  (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} size={size} color={color} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitle: () => <LogoTitle subtitle="Sales" />,
        headerTitleAlign: 'left',
        headerRight: () => <AccountButton />,
        headerStyle: { backgroundColor: '#fff' },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Brochures', tabBarIcon: icon('book-outline') }} />
      <Tabs.Screen name="avl" options={{ title: 'AVL', tabBarIcon: icon('list-outline') }} />
      <Tabs.Screen name="decks" options={{ title: 'Decks', tabBarIcon: icon('easel-outline') }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved', tabBarIcon: icon('cloud-download-outline') }} />
    </Tabs>
  );
}
