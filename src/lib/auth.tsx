import AsyncStorage from '@react-native-async-storage/async-storage';
import { exchangeCodeAsync, makeRedirectUri, refreshAsync, type DiscoveryDocument } from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { APP_SCHEME, AZURE_CLIENT_ID, GRAPH_SCOPES, TENANT } from '../config';

const REFRESH_KEY = 'miphi.refreshToken';
const USER_KEY = 'miphi.user';

export const discovery: DiscoveryDocument = {
  authorizationEndpoint: `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
  endSessionEndpoint: `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/logout`,
};

export const redirectUri = makeRedirectUri({ scheme: APP_SCHEME, path: 'auth' });

export type UserInfo = { name: string; email: string };

type Status = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: Status;
  user: UserInfo | null;
  completeSignIn: (code: string, codeVerifier: string) => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: (forceRefresh?: boolean) => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Access token lives only in memory; the refresh token is kept in the device keychain/keystore.
let memToken: { token: string; expiresAt: number } | null = null;
let refreshInFlight: Promise<string> | null = null;
let onSessionExpired: (() => void) | null = null;

export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please sign in again.');
  }
}

async function saveTokens(res: { accessToken: string; refreshToken?: string; expiresIn?: number }) {
  memToken = { token: res.accessToken, expiresAt: Date.now() + (res.expiresIn ?? 3600) * 1000 };
  if (res.refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, res.refreshToken);
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!refreshToken) throw new SessionExpiredError();
  try {
    const res = await refreshAsync({ clientId: AZURE_CLIENT_ID, refreshToken, scopes: GRAPH_SCOPES }, discovery);
    await saveTokens(res);
    return res.accessToken;
  } catch (e: any) {
    const msg = String(e?.message || e);
    // invalid_grant = refresh token revoked or expired: force a new sign in.
    if (/invalid_grant|interaction_required|AADSTS700082|AADSTS50173/i.test(msg)) {
      await SecureStore.deleteItemAsync(REFRESH_KEY);
      memToken = null;
      onSessionExpired?.();
      throw new SessionExpiredError();
    }
    throw e;
  }
}

export async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && memToken && memToken.expiresAt - Date.now() > 120_000) return memToken.token;
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function fetchMe(token: string): Promise<UserInfo | null> {
  try {
    const r = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const j = await r.json();
    return { name: j.displayName || '', email: j.mail || j.userPrincipalName || '' };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    onSessionExpired = () => setStatus('signedOut');
    (async () => {
      const rt = await SecureStore.getItemAsync(REFRESH_KEY);
      const u = await AsyncStorage.getItem(USER_KEY);
      if (u) setUser(JSON.parse(u));
      // Signed in if a refresh token exists. Works offline too, so saved files stay usable.
      setStatus(rt ? 'signedIn' : 'signedOut');
    })();
    return () => {
      onSessionExpired = null;
    };
  }, []);

  const completeSignIn = useCallback(async (code: string, codeVerifier: string) => {
    const res = await exchangeCodeAsync(
      { clientId: AZURE_CLIENT_ID, code, redirectUri, scopes: GRAPH_SCOPES, extraParams: { code_verifier: codeVerifier } },
      discovery,
    );
    await saveTokens(res);
    const me = await fetchMe(res.accessToken);
    if (me) {
      setUser(me);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(me));
    }
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    memToken = null;
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo(
    () => ({ status, user, completeSignIn, signOut, getAccessToken }),
    [status, user, completeSignIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
