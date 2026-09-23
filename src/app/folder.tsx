import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { LibraryList } from '../components/LibraryList';
import type { SectionKey } from '../config';

export default function Folder() {
  const { driveId, itemId, title, section } = useLocalSearchParams<{
    driveId: string;
    itemId: string;
    title: string;
    section: SectionKey;
  }>();
  return (
    <>
      <Stack.Screen options={{ title: title || 'Folder' }} />
      <LibraryList key={itemId} section={section || 'brochures'} folder={{ driveId, itemId }} />
    </>
  );
}
