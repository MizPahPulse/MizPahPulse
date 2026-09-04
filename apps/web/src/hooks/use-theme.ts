'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  getInitialTheme,
  getStoredTheme,
  saveTheme,
  subscribeToSystemTheme,
  type Theme,
} from '@/lib/theme';

/**
 * Theme state hook (issue #6).
 *
 * - Applies the effective theme to the document on every change.
 * - Persists explicit user choices to localStorage.
 * - While the user has NOT chosen a theme, follows the OS
 *   `prefers-color-scheme` preference live (and stops once overridden).
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());
  const [hasPreference, setHasPreference] = useState<boolean>(() => getStoredTheme() !== null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Follow the OS theme until the user explicitly picks one.
  useEffect(() => {
    if (hasPreference) return;
    return subscribeToSystemTheme((systemTheme) => setThemeState(systemTheme));
  }, [hasPreference]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    setHasPreference(true);
    saveTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      setHasPreference(true);
      saveTheme(next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
