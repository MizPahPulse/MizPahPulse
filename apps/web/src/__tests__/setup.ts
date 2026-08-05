import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

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

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

// Mock process.env for client-side tests
Object.defineProperty(process.env, 'NEXT_PUBLIC_STELLAR_NETWORK', { value: 'TESTNET' });
Object.defineProperty(process.env, 'NEXT_PUBLIC_WS_URL', { value: 'http://localhost:3001' });
Object.defineProperty(process.env, 'NEXT_PUBLIC_PULSE_CONTRACT_ID', {
  value: 'CC4HXCVIOPUOS2UJFLTM6WP2ESNSWM4BGJ26XR4SRRVB74TOZMC7EE2C',
});

// Mock window.freighterApi
Object.defineProperty(window, 'freighterApi', {
  value: undefined,
  writable: true,
});
