/**
 * Unit tests for the SSE connection registry (issue #39): registering and
 * unregistering streams, counting open connections, and the graceful
 * shutdown path where every client receives `event: shutdown` and is closed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registerSseClient,
  activeSseClientCount,
  closeAllSseStreams,
  installSseShutdownHandlers,
} from '@/lib/sse-clients';

function makeHandle() {
  const frames: string[] = [];
  const close = vi.fn();
  return {
    frames,
    close,
    handle: {
      enqueue: (frame: string) => {
        frames.push(frame);
        return true;
      },
      close,
    },
  };
}

describe('sse-clients registry (#39)', () => {
  // The registry is a module-level Map shared across tests in this file, so
  // drain it between tests to keep counts deterministic.
  beforeEach(() => {
    closeAllSseStreams();
  });
  afterEach(() => {
    closeAllSseStreams();
  });

  it('registers streams and reports the active count', () => {
    const a = makeHandle();
    const b = makeHandle();
    const unregisterA = registerSseClient(a.handle);
    registerSseClient(b.handle);

    expect(activeSseClientCount()).toBe(2);
    unregisterA();
    expect(activeSseClientCount()).toBe(1);
    // Unregistering twice is a no-op.
    unregisterA();
    expect(activeSseClientCount()).toBe(1);
  });

  it('closeAllSseStreams sends event: shutdown then closes every stream', () => {
    const a = makeHandle();
    const b = makeHandle();
    registerSseClient(a.handle);
    registerSseClient(b.handle);

    const closedCount = closeAllSseStreams('deploy');

    expect(closedCount).toBe(2);
    expect(activeSseClientCount()).toBe(0);
    for (const client of [a, b]) {
      expect(client.close).toHaveBeenCalledOnce();
      const frame = client.frames[0];
      expect(frame).toContain('event: shutdown');
      expect(frame).toContain('"reason":"deploy"');
    }
  });

  it('closing all streams with none open is a no-op', () => {
    expect(closeAllSseStreams()).toBe(0);
  });

  it('installSseShutdownHandlers is idempotent per process', () => {
    // A second call must not throw or stack duplicate listeners — the guard
    // flag short-circuits after the first install.
    expect(() => installSseShutdownHandlers()).not.toThrow();
    expect(() => installSseShutdownHandlers()).not.toThrow();
  });
});
