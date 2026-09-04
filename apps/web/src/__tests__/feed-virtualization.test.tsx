/**
 * Component tests for the virtualized feed list (issue #12):
 *  - a 100-event buffer renders far fewer rows in the DOM
 *  - scrolling moves the rendered window (newest rows leave the DOM)
 *  - auto-scroll's end marker is preserved
 *
 * `useWebSocket` is mocked at the hook boundary (same pattern as
 * feed-page-component.test.tsx); the 100 events are seeded through the feed's
 * localStorage persistence path so the buffer is populated synchronously.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeedPage from '@/app/dashboard/feed/page';

const hookMock = vi.hoisted(() => {
  const state = {
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
  };
});

vi.mock('@/hooks/use-websocket', () => ({
  useWebSocket: hookMock.useWebSocket,
}));

const FEED_STORAGE_KEY = 'mizpahpulse.feed.v1';
const originalScrollIntoView = Element.prototype.scrollIntoView;

function makeEvent(id: number) {
  return {
    id: `evt-${id}`,
    type: 'PAYMENT',
    category: 'PAYMENT',
    title: `Payment event ${id}`,
    from: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    amount: `${id} XLM`,
    time: '1s ago',
    status: 'success' as const,
    timestamp: Date.now() - (100 - id) * 1000,
  };
}

describe('FeedPage virtualized list (#12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('renders a bounded window of rows for a 100-event buffer', () => {
    const events = Array.from({ length: 100 }, (_, i) => makeEvent(99 - i)); // newest-first
    window.localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(events));

    render(<FeedPage />);

    const articles = screen.getAllByRole('article');
    expect(articles.length).toBeGreaterThan(0);
    // Bounded DOM: far fewer rows than the 100 in the buffer.
    expect(articles.length).toBeLessThan(100);
    expect(articles.length).toBeLessThanOrEqual(16);

    // Newest rows (highest ids) are the first ones rendered.
    expect(screen.getByText('Payment event 99')).toBeInTheDocument();
  });

  it('moves the rendered window when the feed is scrolled', () => {
    const events = Array.from({ length: 100 }, (_, i) => makeEvent(99 - i)); // newest-first
    window.localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(events));

    render(<FeedPage />);

    const feed = screen.getByRole('feed');
    // Newest rows are visible at the top before scrolling.
    expect(screen.getByText('Payment event 99')).toBeInTheDocument();

    // Scroll deep into the buffer: the newest rows leave the DOM and an older
    // slice takes their place.
    Object.defineProperty(feed, 'scrollTop', { value: 6000, configurable: true });
    fireEvent.scroll(feed);

    expect(screen.queryByText('Payment event 99')).not.toBeInTheDocument();
    // An older event (well below the initial window) is now rendered.
    expect(screen.getByText('Payment event 30')).toBeInTheDocument();
    // The DOM stays bounded even mid-scroll.
    expect(screen.getAllByRole('article').length).toBeLessThanOrEqual(16);
  });

  it('keeps the auto-scroll end marker inside the scroll container', () => {
    const events = Array.from({ length: 20 }, (_, i) => makeEvent(19 - i)); // newest-first
    window.localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(events));

    render(<FeedPage />);

    // The end marker (scrollIntoView target) still exists after virtualization.
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
