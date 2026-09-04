/**
 * Theme helpers (issue #6).
 *
 * Dark mode syncs with the OS `prefers-color-scheme` preference unless the
 * user has explicitly overridden it (stored in localStorage). The inline
 * bootstrap script runs before first paint so the app never flashes the wrong
 * theme on load.
 */

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'mizpah-pulse:dark-mode';

/** Read the user's stored override ('true'/'false' legacy format). */
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'true') return 'dark';
    if (stored === 'false') return 'light';
    return null;
  } catch {
    return null;
  }
}

/** Resolve the OS theme via `prefers-color-scheme` (light when unavailable). */
export function getSystemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Effective theme: explicit user choice first, otherwise the system theme. */
export function getInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

/** Apply a theme to the document (class for Tailwind + colorScheme for chrome). */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

/** Persist an explicit user choice. */
export function saveTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme === 'dark' ? 'true' : 'false');
  } catch {
    // Storage unavailable (private mode/quota) — the theme still applies for this session.
  }
}

/**
 * Subscribe to OS theme changes. Returns an unsubscribe function.
 * Falls back to the legacy `addListener` API where `addEventListener` is
 * missing (older browsers).
 */
export function subscribeToSystemTheme(onChange: (theme: Theme) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (event: MediaQueryListEvent) => onChange(event.matches ? 'dark' : 'light');

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }
  if (typeof media.addListener === 'function') {
    media.addListener(handler);
    return () => media.removeListener(handler);
  }
  return () => {};
}

/**
 * Inline script injected into the root layout so the theme class is set before
 * first paint (no flash of the wrong theme). Keep in sync with the helpers above.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var key='${THEME_STORAGE_KEY}';var stored=localStorage.getItem(key);var dark=stored==='true'||(stored===null&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light';}catch(e){}})();`;
