'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { validateServerUrl, normalizeBaseUrl } from '@/lib/config/env';
import { loadSession, storeSession, clearSession } from '@/lib/storage';
import { validateCredentials } from '@/lib/api/client';
import type { UserSessionConfig, StoredSession } from '@/types';

interface AuthContextValue {
  /** Current session configuration (null if not authenticated) */
  session: UserSessionConfig | null;

  /** Whether the user is authenticated */
  isAuthenticated: boolean;

  /** Whether authentication is in progress */
  isLoading: boolean;

  /** Whether initial session load from storage is in progress */
  isInitializing: boolean;

  /** Last authentication error */
  error: string | null;

  /**
   * Authenticate user with server credentials
   * Validates credentials by calling /feeds endpoint
   * Stores session in storage on success
   */
  login: (
    baseUrl: string,
    username: string,
    password: string,
    rememberDevice?: boolean,
  ) => Promise<void>;

  /**
   * Clear authentication and remove stored session
   */
  logout: () => void;

  /**
   * Update session preferences
   */
  updatePreferences: (
    preferences: Partial<Pick<UserSessionConfig, 'viewMode' | 'sortOrder' | 'showRead'>>,
  ) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Encode username and password to Base64 for Basic auth
 */
function encodeCredentials(username: string, password: string): string {
  return btoa(`${username}:${password}`);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSessionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load session from storage on mount
  useEffect(() => {
    const loadStoredSession = () => {
      const stored = loadSession();
      if (stored) {
        // Convert StoredSession to UserSessionConfig
        const session: UserSessionConfig = {
          baseUrl: stored.baseUrl,
          username: stored.username,
          credentials: stored.credentials,
          rememberDevice: stored.rememberDevice,
          viewMode: 'card',
          sortOrder: 'newest',
          showRead: false,
          lastSyncAt: new Date().toISOString(),
        };
        setSession(session);
      }
      setIsInitializing(false);
    };

    loadStoredSession();
  }, []);

  const login = useCallback(
    async (baseUrl: string, username: string, password: string, rememberDevice = false) => {
      setIsLoading(true);
      setError(null);

      try {
        // Validate and normalize URL
        const validation = validateServerUrl(baseUrl);

        if (!validation.valid) {
          throw new Error(validation.error ?? 'Invalid server URL');
        }

        const normalizedUrl = normalizeBaseUrl(baseUrl);
        if (!normalizedUrl) {
          throw new Error('Failed to normalize server URL');
        }

        // Validate required fields
        if (!username.trim()) {
          throw new Error('Username is required');
        }

        if (!password) {
          throw new Error('Password is required');
        }

        // Encode credentials
        const credentials = encodeCredentials(username, password);

        // Validate credentials by calling the API with explicit credentials
        // This avoids relying on storage which hasn't been set yet
        const validationResult = await validateCredentials(normalizedUrl, credentials);

        if (!validationResult.valid) {
          throw new Error(validationResult.error ?? 'Authentication failed');
        }

        // If we get here, credentials are valid - create the session
        const newSession: UserSessionConfig = {
          baseUrl: normalizedUrl,
          username: username.trim(),
          credentials,
          rememberDevice,
          viewMode: 'card',
          sortOrder: 'newest',
          showRead: false,
          lastSyncAt: new Date().toISOString(),
        };

        // Store session
        const storedSession: StoredSession = {
          baseUrl: newSession.baseUrl,
          username: newSession.username,
          credentials: newSession.credentials,
          rememberDevice: newSession.rememberDevice,
        };
        storeSession(storedSession);

        // Update state
        setSession(newSession);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    // Clear session from both storage types
    clearSession();

    // Clear state
    setSession(null);
    setError(null);
  }, []);

  const updatePreferences = useCallback(
    (preferences: Partial<Pick<UserSessionConfig, 'viewMode' | 'sortOrder' | 'showRead'>>) => {
      if (!session) return;

      const updatedSession: UserSessionConfig = {
        ...session,
        ...preferences,
      };

      // Store updated session
      const storedSession: StoredSession = {
        baseUrl: updatedSession.baseUrl,
        username: updatedSession.username,
        credentials: updatedSession.credentials,
        rememberDevice: updatedSession.rememberDevice,
      };
      storeSession(storedSession);

      // Update state
      setSession(updatedSession);
    },
    [session],
  );

  const value: AuthContextValue = {
    session,
    isAuthenticated: session !== null,
    isLoading,
    isInitializing,
    error,
    login,
    logout,
    updatePreferences,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 * Must be used within AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
