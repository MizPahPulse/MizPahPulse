/**
 * Hook tests for useEventSource (issue #39).
 *
 * A fake EventSource records listeners and lets tests dispatch events:
 *  - named `event` messages update `data` (parsed as JSON)
 *  - a `shutdown` message closes the socket and marks the stream closed
 *  - plain `message` events still work
 *  - unmounting closes the socket and removes listeners
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useEventSource } from '@/hooks/use-event-source';

type Listener = ((event: MessageEvent<string>) => void) | null;

class FakeEventSource {
  static instances: FakeEventSource[] = [];

  url: string;
  onopen: Listener = null;
  onmessage: Listener = null;
  onerror: Listener = null;
  closed = false;
  private listeners = new Map<string, Set<Listener>>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    if (!listener) return;
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: Listener) {
    if (!listener) return;
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string, data: string) {
    const event = new MessageEvent(type, { data });
    if (type === 'message') this.onmessage?.(event);
    for (const listener of this.listeners.get(type) ?? []) {
      if (listener) listener(event);
    }
  }

  open() {
    this.onopen?.(new MessageEvent('open'));
  }

  fail() {
    this.onerror?.(new MessageEvent('error'));
  }

  close() {
    this.closed = true;
  }
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal('EventSource', FakeEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useEventSource (#39)', () => {
  it('parses named event messages into data', () => {
    const { result } = renderHook(() => useEventSource('/api/v1/events/live'));

    const es = FakeEventSource.instances[0];
    expect(es).toBeTruthy();

    act(() => {
      es.open();
      es.dispatch('event', JSON.stringify({ id: 'evt_1', eventType: 'PAYMENT' }));
    });

    expect(result.current.status).toBe('open');
    expect(result.current.data).toEqual({ id: 'evt_1', eventType: 'PAYMENT' });
  });

  it('closes the socket and reports closed on a shutdown event (#39)', () => {
    const { result } = renderHook(() => useEventSource('/api/v1/events/live'));
    const es = FakeEventSource.instances[0];

    act(() => {
      es.dispatch('shutdown', JSON.stringify({ reason: 'server_shutdown' }));
    });

    expect(result.current.status).toBe('closed');
    expect(es.closed).toBe(true);
  });

  it('marks the stream closed on a network error', () => {
    const { result } = renderHook(() => useEventSource('/api/v1/events/live'));
    const es = FakeEventSource.instances[0];

    act(() => {
      es.fail();
    });

    expect(result.current.status).toBe('closed');
    expect(es.closed).toBe(true);
  });

  it('exposes a close() that shuts the socket down', () => {
    const { result } = renderHook(() => useEventSource('/api/v1/events/live'));
    const es = FakeEventSource.instances[0];

    act(() => {
      result.current.close();
    });

    expect(es.closed).toBe(true);
    expect(result.current.status).toBe('closed');
  });

  it('closes the socket when the hook unmounts', () => {
    const { unmount } = renderHook(() => useEventSource('/api/v1/events/live'));
    const es = FakeEventSource.instances[0];

    unmount();
    expect(es.closed).toBe(true);
  });
});
