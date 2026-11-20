import React, { useCallback, useMemo, useState } from 'react';
import { loginRequest } from '../lib/api';
import { AuthContext, type AuthContextValue } from './useAuth';

const TOKEN_STORAGE_KEY = 'aether_access_token';

function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(() => readStoredToken());

  const login = useCallback(async (username: string, password: string) => {
    const data = await loginRequest({ username, password });
    try {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken);
    } catch {
      // Ignore storage quota / privacy mode failures and keep token in memory
    }
    setToken(data.accessToken);
  }, []);

  const logout = useCallback(() => {
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage failures
    }
    setToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
