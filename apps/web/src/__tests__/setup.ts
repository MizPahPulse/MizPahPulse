import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link (using createElement since this file is plain .ts — JSX is not
// valid outside .tsx, which previously broke the entire test suite with TS1005)
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) =>
    React.createElement('a', { href: String(href), ...props }, children as React.ReactNode),
}));

// Mock process.env for client-side tests.
// NOTE: Object.defineProperty on process.env throws in Node 20+ ('only accepts a
// configurable, writable, and enumerable data descriptor') — vi.stubEnv is the
// vitest-native, type-safe way to set env vars for tests.
vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'TESTNET');
vi.stubEnv('NEXT_PUBLIC_WS_URL', 'http://localhost:3001');
vi.stubEnv(
  'NEXT_PUBLIC_PULSE_CONTRACT_ID',
  'CC4HXCVIOPUOS2UJFLTM6WP2ESNSWM4BGJ26XR4SRRVB74TOZMC7EE2C',
);

// Mock window.freighterApi (configurable so tests can delete/redefine it)
Object.defineProperty(window, 'freighterApi', {
  value: undefined,
  writable: true,
  configurable: true,
});
