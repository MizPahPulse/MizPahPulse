/**
 * Unit tests for the prefersReducedMotion helper (issue #23).
 *
 * jsdom does not implement window.matchMedia, so each test controls whether
 * the media-query API exists and what the user preference reports.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { prefersReducedMotion } from '@/lib/reduced-motion';

function stubMatchMedia(matches: boolean) {
  const matchMedia = vi.fn((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  });
  return matchMedia;
}

describe('prefersReducedMotion', () => {
  afterEach(() => {
    // Remove any stub so tests start from a clean (matchMedia-less) jsdom.
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    vi.restoreAllMocks();
  });

  it('returns false when matchMedia is unavailable', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it('returns true when the user prefers reduced motion', () => {
    const matchMedia = stubMatchMedia(true);

    expect(prefersReducedMotion()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('returns false when the user has no motion preference', () => {
    stubMatchMedia(false);

    expect(prefersReducedMotion()).toBe(false);
  });
});
