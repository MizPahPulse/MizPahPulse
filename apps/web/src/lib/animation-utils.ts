export function prefersReducedMotion(): boolean { return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
export function getTransitionDuration(duration = 200): number { return prefersReducedMotion() ? 0 : duration; }
