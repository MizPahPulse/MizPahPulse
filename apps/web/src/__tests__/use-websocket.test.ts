/**
 * Unit tests for the useWebSocket hook using a mocked socket.io-client.
 *
 * Covers issue #87: connect/disconnect state, event flow, subscriptions,
 * manual reconnect, and cleanup on unmount.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '@/hooks/use-websocket';

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

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handlers.clear();
  });

  it('opens a socket to the configured WS URL with reconnection enabled', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(mocks.io).toHaveBeenCalledWith(
      'http://localhost:3001',
      expect.objectContaining({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      }),
    );
    expect(result.current.isConnected).toBe(false);
    expect(result.current.everConnected).toBe(false);
  });

  it('flips to connected on the connect event and subscribes to provided filters', () => {
    const { result } = renderHook(() =>
      useWebSocket({ eventTypes: ['PAYMENT'], categories: ['PAYMENT'], accountIds: ['GABC'] }),
    );

    act(() => serverEmit('connect'));

    expect(result.current.isConnected).toBe(true);
    expect(result.current.everConnected).toBe(true);
    expect(mocks.socket.emit).toHaveBeenCalledWith('subscribe:eventTypes', ['PAYMENT']);
    expect(mocks.socket.emit).toHaveBeenCalledWith('subscribe:categories', ['PAYMENT']);
    expect(mocks.socket.emit).toHaveBeenCalledWith('subscribe:accounts', ['GABC']);
  });

  it('surfaces incoming event and stats payloads', () => {
    const { result } = renderHook(() => useWebSocket());
    act(() => serverEmit('connect'));

    const eventPayload = { id: 'evt-1', eventType: 'PAYMENT' };
    act(() => serverEmit('event', eventPayload));
    expect(result.current.lastEvent).toEqual(eventPayload);

    const statsPayload = { activeConnections: 3, totalConnections: 42 };
    act(() => serverEmit('stats', statsPayload));
    expect(result.current.connectionStats).toEqual(statsPayload);
  });

  it('reports disconnected on disconnect while everConnected stays sticky', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => serverEmit('connect'));
    act(() => serverEmit('disconnect'));

    expect(result.current.isConnected).toBe(false);
    // Sticky flag: the feed can now distinguish "lost after being live" from
    // "still establishing the first connection".
    expect(result.current.everConnected).toBe(true);
  });

  it('re-subscribes to the latest filters when the connection is re-established', () => {
    const { result, rerender } = renderHook(
      ({ eventTypes }: { eventTypes: string[] }) => useWebSocket({ eventTypes }),
      { initialProps: { eventTypes: ['PAYMENT'] } },
    );

    act(() => serverEmit('connect'));
    rerender({ eventTypes: ['DEX_TRADE'] });

    expect(mocks.socket.emit).toHaveBeenCalledWith('subscribe:eventTypes', ['DEX_TRADE']);
    expect(result.current.isConnected).toBe(true);
  });

  it('exposes subscribe/unsubscribe helpers that emit socket events', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => result.current.subscribe(['PAYMENT']));
    expect(mocks.socket.emit).toHaveBeenCalledWith('subscribe:eventTypes', ['PAYMENT']);

    act(() => result.current.unsubscribe(['PAYMENT']));
    expect(mocks.socket.emit).toHaveBeenCalledWith('unsubscribe:eventTypes', ['PAYMENT']);
  });

  it('reconnect() tears down the old socket and opens a fresh one', () => {
    const { result } = renderHook(() => useWebSocket());
    expect(mocks.io).toHaveBeenCalledTimes(1);

    act(() => serverEmit('connect'));
    act(() => result.current.reconnect());

    expect(mocks.socket.disconnect).toHaveBeenCalled();
    expect(mocks.io).toHaveBeenCalledTimes(2);

    // The fresh socket can connect again.
    act(() => serverEmit('connect'));
    expect(result.current.isConnected).toBe(true);
  });

  it('disconnects the socket on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket());

    unmount();

    expect(mocks.socket.disconnect).toHaveBeenCalled();
  });

  it('does not open a socket when disabled', () => {
    renderHook(() => useWebSocket({ enabled: false }));

    expect(mocks.io).not.toHaveBeenCalled();
  });
});
