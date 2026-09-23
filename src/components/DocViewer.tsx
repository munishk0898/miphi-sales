import type { File } from 'expo-file-system';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { colors } from '../theme';
import { PDF_VIEWER_HTML } from '../viewer/pdfViewerHtml';

type Props = { file: File; kind: 'pdf' | 'image' };

const CHUNK = 512 * 1024;

/**
 * iOS: WKWebView renders PDFs and images natively (pinch zoom, crisp text).
 * Android: WebView cannot render PDFs, so a bundled pdf.js page draws them. Works offline.
 */
export function DocViewer({ file, kind }: Props) {
  if (Platform.OS === 'ios' || kind === 'image') {
    const dirUri = file.uri.slice(0, file.uri.lastIndexOf('/') + 1);
    return (
      <WebView
        style={styles.web}
        source={{ uri: file.uri }}
        originWhitelist={['*']}
        allowFileAccess
        allowingReadAccessToURL={dirUri}
        setBuiltInZoomControls
        setDisplayZoomControls={false}
        startInLoadingState
        renderLoading={() => <Loading />}
      />
    );
  }
  return <AndroidPdf file={file} />;
}

function AndroidPdf({ file }: { file: File }) {
  const ref = useRef<WebView>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const sent = useRef(false);

  const onMessage = useCallback(
    async (e: WebViewMessageEvent) => {
      let msg: any;
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (msg.type === 'ready' && !sent.current) {
        sent.current = true;
        try {
          const b64 = await file.base64();
          for (let i = 0; i < b64.length; i += CHUNK) {
            ref.current?.injectJavaScript(`window.__pdfChunk("${b64.slice(i, i + CHUNK)}");true;`);
          }
          ref.current?.injectJavaScript('window.__pdfLoad();true;');
        } catch {
          setState('error');
        }
      } else if (msg.type === 'loaded') {
        setState('ready');
      } else if (msg.type === 'error') {
        setState('error');
      }
    },
    [file],
  );

  return (
    <View style={styles.fill}>
      <WebView
        ref={ref}
        style={styles.web}
        source={{ html: PDF_VIEWER_HTML, baseUrl: 'https://viewer.miphi.local/' }}
        originWhitelist={['*']}
        javaScriptEnabled
        onMessage={onMessage}
        setBuiltInZoomControls
        setDisplayZoomControls={false}
        scalesPageToFit
        // Never navigate away from the viewer page.
        onShouldStartLoadWithRequest={(r) => r.url.startsWith('https://viewer.miphi.local') || r.url === 'about:blank'}
      />
      {state === 'loading' && (
        <View style={StyleSheet.absoluteFill}>
          <Loading label="Opening document…" />
        </View>
      )}
      {state === 'error' && (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={styles.err}>This document could not be displayed. Use Share to open it in another app.</Text>
        </View>
      )}
    </View>
  );
}

function Loading({ label }: { label?: string }) {
  return (
    <View style={[styles.fill, styles.center, { backgroundColor: '#E9E9EB' }]}>
      <ActivityIndicator size="large" color={colors.orange} />
      {label ? <Text style={styles.loadingText}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  web: { flex: 1, backgroundColor: '#E9E9EB' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: colors.muted },
  err: { color: colors.muted, fontSize: 15, textAlign: 'center' },
});
