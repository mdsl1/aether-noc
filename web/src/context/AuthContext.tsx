import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { loginRequest, logoutRequest } from '../lib/api';
import { AuthContext, type AuthContextValue } from './useAuth';

const TOKEN_STORAGE_KEY = 'aether_access_token';

function clearStoredTokens(): void {
  try {
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures
  }
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures
  }
}

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) {
      return false;
    }
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(window.atob(padded)) as { exp?: unknown };
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

function readStoredToken(): string | null {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures
  }

  try {
    const stored = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    if (isJwtExpired(stored)) {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => readStoredToken());

  const login = useCallback(async (username: string, password: string) => {
    const data = await loginRequest({ username, password });
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage failures
    }
    try {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken);
    } catch {
      // Ignore storage quota / privacy mode failures and keep token in memory
    }
    setToken(data.accessToken);
  }, []);

  const clearSession = useCallback(() => {
    clearStoredTokens();
    queryClient.clear();
    setToken(null);
  }, [queryClient]);

  const logout = useCallback(() => {
    const currentToken = token;
    clearStoredTokens();
    queryClient.clear();
    setToken(null);
    if (currentToken) {
      void logoutRequest(currentToken).catch(() => undefined);
    }
  }, [token, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
      clearSession,
    }),
    [token, login, logout, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
