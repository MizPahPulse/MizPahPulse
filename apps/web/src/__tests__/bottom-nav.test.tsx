import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottomNav } from '@/components/navigation';

/**
 * Component tests for the mobile bottom navigation bar (issue #4).
 *
 * `usePathname` from next/navigation is mocked so the active-route behavior
 * can be asserted per path.
 */
const pathnameMock = vi.hoisted(() => ({ current: '/dashboard' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock.current,
  useRouter: () => ({ push: vi.fn() }),
}));

describe('BottomNav', () => {
  afterEach(() => {
    pathnameMock.current = '/dashboard';
  });

  it('renders the four primary sections in an accessible nav landmark', () => {
    render(<BottomNav />);

    const nav = screen.getByRole('navigation', { name: 'Bottom navigation' });
    expect(nav).toBeInTheDocument();
    // Hidden on desktop — the sidebar takes over from the lg breakpoint up.
    expect(nav.className).toContain('lg:hidden');
    // iOS safe-area inset respected.
    expect(nav.className).toContain('env(safe-area-inset-bottom)');

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Live Feed' })).toHaveAttribute(
      'href',
      '/dashboard/feed',
    );
    expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute(
      'href',
      '/dashboard/search',
    );
    expect(screen.getByRole('link', { name: 'Wallets' })).toHaveAttribute(
      'href',
      '/dashboard/wallets',
    );
  });

  it('marks the active route with aria-current and a highlight class', () => {
    pathnameMock.current = '/dashboard/feed';
    render(<BottomNav />);

    expect(screen.getByRole('link', { name: 'Live Feed' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Live Feed' }).className).toContain('text-indigo-600');

    // Sibling links are neither marked current nor highlighted.
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Search' }).className).not.toContain('text-indigo-600');
  });

  it('defaults to no active tab on non-bottom-nav routes', () => {
    pathnameMock.current = '/dashboard/webhooks';
    render(<BottomNav />);

    for (const label of ['Dashboard', 'Live Feed', 'Search', 'Wallets']) {
      expect(screen.getByRole('link', { name: label })).not.toHaveAttribute('aria-current');
    }
  });
});
