/**
 * Whether the user has requested reduced motion via the
 * `prefers-reduced-motion: reduce` media query.
 *
 * Used to gate JS-driven motion (e.g. smooth auto-scroll) that a global CSS
 * rule cannot influence. Returns `false` when `matchMedia` is unavailable
 * (SSR, older browsers, test environments) so motion never silently breaks.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
