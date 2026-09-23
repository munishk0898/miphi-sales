import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export function LogoTitle({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.row}>
      <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 92, height: 32 },
  sub: { marginLeft: 8, fontSize: 16, fontWeight: '700', color: colors.ink, letterSpacing: 0.3 },
});
