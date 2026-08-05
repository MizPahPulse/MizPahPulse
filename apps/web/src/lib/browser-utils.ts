export function isBrowser(): boolean { return typeof window !== 'undefined'; }
export function isTouchDevice(): boolean { return isBrowser() && 'ontouchstart' in window; }
export function getViewportWidth(): number { return isBrowser() ? window.innerWidth : 1024; }
export function getViewportHeight(): number { return isBrowser() ? window.innerHeight : 768; }
export function prefersReducedMotion(): boolean { return isBrowser() && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
