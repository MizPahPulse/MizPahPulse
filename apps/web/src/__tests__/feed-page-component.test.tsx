/**
 * Component tests for the live feed page with `useWebSocket` mocked at the
 * hook boundary (issue #85): connecting state, event rendering, category +
 * search filtering, and simulation mode driven by fake timers.
 *
 * Unlike feed-page.test.tsx (which mocks socket.io-client and exercises the
 * real hook), these tests swap the hook itself so the page's rendering and
 * filtering logic can be exercised in isolation.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FeedPage from '@/app/dashboard/feed/page';

const hookMock = vi.hoisted(() => {
  let state = {
    isConnected: false,
    everConnected: false,
    lastEvent: null as unknown,
    connectionStats: null,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    reconnect: vi.fn(),
  };
  return {
    useWebSocket: vi.fn(() => state),
    setState: (partial: Partial<typeof state>) => {
      // Replace the object so the page observes a fresh `lastEvent` reference
      // (mirroring how the real hook emits new event payloads).
      state = { ...state, ...partial };
    },
    reset: () => {
      state = {
        isConnected: false,
        everConnected: false,
        lastEvent: null,
        connectionStats: null,
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        reconnect: vi.fn(),
      };
    },
  };
});

vi.mock('@/hooks/use-websocket', () => ({
  useWebSocket: hookMock.useWebSocket,
}));

const originalScrollIntoView = Element.prototype.scrollIntoView;

/** Minimal LiveEvent-shaped payload understood by the feed page. */
function liveEvent(eventType: string, data: Record<string, unknown>) {
  return {
    channel: 'events',
    eventType,
    data,
    timestamp: new Date().toISOString(),
    sequence: 1,
  };
}

const PAYMENT = liveEvent('PAYMENT', {
  category: 'PAYMENT',
  accountId: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  amount: '125',
  assetCode: 'XLM',
});

const TRADE = liveEvent('DEX_TRADE', {
  category: 'DEX',
  accountId: 'GDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  sellingAsset: 'XLM',
  buyingAsset: 'USDC',
});

describe('FeedPage (useWebSocket mocked at the hook boundary)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookMock.reset();
    // The feed persists its buffer to localStorage; reset it so events seeded
    // by one test don't leak into the next (e.g. hiding the simulate button).
    window.localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
    vi.useRealTimers();
  });

  it('renders the connecting state and passes options through to the hook', () => {
    render(<FeedPage />);

    expect(hookMock.useWebSocket).toHaveBeenCalledWith({ enabled: true });
    expect(screen.getByText(/Connecting to event stream/i)).toBeInTheDocument();
    // Simulation is offered while disconnected with no buffered events.
    expect(screen.getByRole('button', { name: 'Simulate events' })).toBeInTheDocument();
  });

  it('renders events pushed through the hook (#85)', async () => {
    const { rerender } = render(<FeedPage />);

    hookMock.setState({ isConnected: true, everConnected: true, lastEvent: PAYMENT });
    rerender(<FeedPage />);

    expect(await screen.findByText('Payment: 125 XLM')).toBeInTheDocument();
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('filters events by category and search text (#85)', async () => {
    const { rerender } = render(<FeedPage />);

    hookMock.setState({ isConnected: true, everConnected: true, lastEvent: PAYMENT });
    rerender(<FeedPage />);
    hookMock.setState({ lastEvent: TRADE });
    rerender(<FeedPage />);

    expect(await screen.findByText('Payment: 125 XLM')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);

    // Category filter: DEX only.
    fireEvent.click(screen.getByRole('button', { name: 'DEX' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('DEX Trade: XLM/USDC')).toBeInTheDocument();
    expect(screen.queryByText('Payment: 125 XLM')).not.toBeInTheDocument();

    // Clear the category filter, then narrow by search text.
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);

    fireEvent.change(screen.getByPlaceholderText('Search by address, hash, or event type...'), {
      target: { value: 'Payment' },
    });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Payment: 125 XLM')).toBeInTheDocument();
  });

  it('simulates events on a timer while disconnected (#85)', () => {
    vi.useFakeTimers();
    render(<FeedPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Simulate events' }));
    expect(screen.queryAllByRole('article')).toHaveLength(0);

    // The simulation interval emits a sample event every 2.5s.
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });
});
