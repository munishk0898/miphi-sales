import { Ionicons } from '@expo/vector-icons';
import { Prompt, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AZURE_CLIENT_ID, GRAPH_SCOPES, isConfigured, TENANT } from '../config';
import { discovery, redirectUri, useAuth } from '../lib/auth';
import { colors, radius } from '../theme';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const { completeSignIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: AZURE_CLIENT_ID,
      scopes: GRAPH_SCOPES,
      redirectUri,
      usePKCE: true,
      prompt: Prompt.SelectAccount,
      extraParams: { domain_hint: TENANT },
    },
    discovery,
  );

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success' && request?.codeVerifier) {
      setBusy(true);
      completeSignIn(response.params.code, request.codeVerifier).catch((e) => {
        setError(String(e?.message || e));
        setBusy(false);
      });
    } else if (response.type === 'error') {
      setError(response.params?.error_description || response.error?.message || 'Sign in failed.');
      setBusy(false);
    } else {
      setBusy(false);
    }
  }, [response, request, completeSignIn]);

  const configured = isConfigured();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appName}>Sales</Text>
        <Text style={styles.tagline}>Brochures, AVL and presentation decks, always up to date.</Text>
      </View>

      <View style={styles.bottom}>
        {error && <Text style={styles.error}>{error}</Text>}
        {!configured && (
          <Text style={styles.error}>
            App not configured yet: set AZURE_CLIENT_ID in src/config.ts (see SETUP.md).
          </Text>
        )}
        <Pressable
          disabled={!request || busy || !configured}
          onPress={() => {
            setError(null);
            setBusy(true);
            promptAsync().catch(() => setBusy(false));
          }}
          style={({ pressed }) => [styles.btn, (pressed || busy) && { opacity: 0.85 }, !configured && { opacity: 0.4 }]}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-microsoft" size={20} color="#fff" />
              <Text style={styles.btnText}>Sign in with Microsoft</Text>
            </>
          )}
        </Pressable>
        <Text style={styles.note}>Use your MiPhi work account. Access is view and download only.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logo: { width: 240, height: 84 },
  appName: { fontSize: 30, fontWeight: '800', fontStyle: 'italic', color: colors.ink, marginTop: 6, letterSpacing: 2 },
  tagline: { marginTop: 16, fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 21 },
  bottom: { paddingHorizontal: 24, paddingBottom: 24 },
  btn: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700', marginLeft: 10 },
  note: { textAlign: 'center', color: colors.faint, fontSize: 12, marginTop: 12 },
  error: { color: colors.danger, textAlign: 'center', marginBottom: 12, fontSize: 13 },
});
