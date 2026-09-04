/**
 * Component tests for the live feed page:
 *  - #9: reconnecting banner when the WebSocket connection drops
 *  - #24: rate-limited aria-live announcements for new feed events
 *
 * The socket.io-client module is mocked so connection lifecycle and incoming
 * events can be simulated deterministically.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import FeedPage from '@/app/dashboard/feed/page';

const mocks = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;
  const handlers = new Map<string, Handler[]>();
  const socket = {
    on: (event: string, handler: Handler) => {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
      return socket;
    },
    emit: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
  };
  return { handlers, socket, io: vi.fn(() => socket) };
});

vi.mock('socket.io-client', () => ({
  io: mocks.io,
}));

/** Simulate the socket.io server pushing an event to the registered handlers. */
function serverEmit(event: string, ...args: unknown[]) {
  const listeners = mocks.handlers.get(event) ?? [];
  listeners.forEach((handler) => handler(...args));
}

/** Minimal LiveEvent-shaped payload understood by the feed page. */
function liveEvent(eventType: string, data: Record<string, unknown>) {
  return { eventType, data };
}

const PAYMENT_EVENT = liveEvent('PAYMENT', {
  category: 'PAYMENT',
  accountId: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  amount: '125',
  assetCode: 'XLM',
});

const TRADE_EVENT = liveEvent('DEX_TRADE', {
  category: 'DEX',
  accountId: 'GDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  sellingAsset: 'XLM',
  buyingAsset: 'USDC',
});

const originalScrollIntoView = Element.prototype.scrollIntoView;

describe('FeedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handlers.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('shows a reconnecting banner when the connection drops and hides it on reconnect (#9)', async () => {
    render(<FeedPage />);

    // Initial state — never connected, no events: connecting state, no banner.
    expect(screen.getByText(/Connecting to event stream/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Connection to the live event stream was lost/i),
    ).not.toBeInTheDocument();

    // Connection established, then dropped.
    act(() => serverEmit('connect'));
    act(() => serverEmit('disconnect'));

    expect(
      await screen.findByText(/Connection to the live event stream was lost/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Reconnecting/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry now' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss reconnecting banner' })).toBeInTheDocument();

    // Manual retry opens a fresh socket.
    act(() => {
      screen.getByRole('button', { name: 'Retry now' }).click();
    });
    expect(mocks.io).toHaveBeenCalledTimes(2);

    // Banner disappears once the connection is re-established.
    act(() => serverEmit('connect'));
    await waitFor(() =>
      expect(
        screen.queryByText(/Connection to the live event stream was lost/i),
      ).not.toBeInTheDocument(),
    );
  });

  it('lets the user dismiss the reconnecting banner (#9)', async () => {
    render(<FeedPage />);
    act(() => serverEmit('connect'));
    act(() => serverEmit('disconnect'));

    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss reconnecting banner' }));

    await waitFor(() =>
      expect(
        screen.queryByText(/Connection to the live event stream was lost/i),
      ).not.toBeInTheDocument(),
    );
  });

  it('announces a rate-limited count of new events via the aria-live region (#24)', async () => {
    render(<FeedPage />);
    act(() => serverEmit('connect'));

    // Two events arrive back-to-back; before the quiet window elapses there is
    // no announcement yet.
    act(() => serverEmit('event', PAYMENT_EVENT));
    act(() => serverEmit('event', TRADE_EVENT));
    expect(screen.queryByText(/added to the live feed/i)).not.toBeInTheDocument();

    // After the 1200ms coalescing window the pair is announced once.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1400));
    });
    expect(screen.getByText('2 new events added to the live feed')).toBeInTheDocument();
  });

  it('suppresses announcements while the feed is paused (#24)', async () => {
    render(<FeedPage />);
    act(() => serverEmit('connect'));

    fireEvent.click(screen.getByRole('button', { name: 'Pause live feed' }));
    // Fresh object references so each emission is treated as a new event.
    act(() => serverEmit('event', { ...PAYMENT_EVENT }));

    // Wait well past the coalescing window — nothing should be announced.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1400));
    });
    expect(screen.queryByText(/added to the live feed/i)).not.toBeInTheDocument();

    // After resuming, new arrivals are announced again.
    fireEvent.click(screen.getByRole('button', { name: 'Resume live feed' }));
    act(() => serverEmit('event', { ...PAYMENT_EVENT }));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1400));
    });
    expect(screen.getByText('1 new event added to the live feed')).toBeInTheDocument();
  });
});
