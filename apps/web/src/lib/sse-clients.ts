/**
 * SSE connection registry (issue #39).
 *
 * Every live stream registers a handle here so the process can notify and
 * close all open connections when it shuts down (SIGTERM/SIGINT). Without
 * this, a deployment leaves clients hanging until their own timeout.
 *
 * The handle is intentionally tiny: the route owns the ReadableStream and
 * gives the registry an `enqueue` (raw SSE frame) and a `close` callback.
 * `closeAllSseStreams` writes a final `event: shutdown` frame to every
 * connection, then closes each stream so no socket is left dangling.
 */

export interface SseClientHandle {
  /** Write a raw SSE frame. Returns false when the stream is already closed. */
  enqueue(frame: string): boolean;
  /** Close the stream (idempotent) and release resources. */
  close(): void;
}

const clients = new Map<string, SseClientHandle>();

let nextClientId = 0;

/** Register a live stream. Returns an unregister function (idempotent). */
export function registerSseClient(client: SseClientHandle): () => void {
  const id = `sse-${++nextClientId}`;
  clients.set(id, client);
  let unregistered = false;
  return () => {
    if (unregistered) return;
    unregistered = true;
    clients.delete(id);
  };
}

/** Number of currently open live streams (used by status/logging). */
export function activeSseClientCount(): number {
  return clients.size;
}

/**
 * Notify every connected client of a shutdown and close their streams.
 *
 * Each client receives one final frame:
 *
 *   event: shutdown
 *   data: {"reason":"server_shutdown"}
 *
 * and is then closed. Returns the number of streams that were notified.
 */
export function closeAllSseStreams(reason = 'server_shutdown'): number {
  const entries = [...clients.entries()];
  for (const [id, client] of entries) {
    client.enqueue(`event: shutdown\ndata: ${JSON.stringify({ reason, connectionId: id })}\n\n`);
    client.close();
    clients.delete(id);
  }
  return entries.length;
}

/**
 * Wire the registry to process termination signals so a server shutdown
 * gracefully drains live streams instead of leaving dangling sockets.
 * Installed once per process (guarded by a global flag so Next.js dev-mode
 * hot reloads do not stack listeners).
 */
export function installSseShutdownHandlers(): void {
  if (typeof process === 'undefined') return;
  const g = globalThis as typeof globalThis & { __mpSseShutdownInstalled?: boolean };
  if (g.__mpSseShutdownInstalled) return;
  g.__mpSseShutdownInstalled = true;

  // Only SIGTERM (what orchestrators/deployments send) is wired here. SIGINT
  // stays untouched so dev tooling keeps its own Ctrl-C behavior.
  process.on('SIGTERM', () => {
    const closed = closeAllSseStreams();
    // eslint-disable-next-line no-console
    console.info(`[SSE] SIGTERM received — closed ${closed} live stream(s)`);
    // Let the final frames flush before the process exits.
    setTimeout(() => process.exit(0), 100);
  });
}
