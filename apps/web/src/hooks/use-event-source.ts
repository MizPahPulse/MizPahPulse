import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Subscribe to an SSE stream that emits named events:
 *
 *   event: connected   — stream opened
 *   event: event       — a live blockchain event (JSON payload)
 *   event: shutdown    — server is going away; the stream is closing (#39)
 *
 * The server also sends `Connection: close` semantics by terminating the
 * stream right after `shutdown`, so the hook closes the EventSource and
 * reports `status: 'closed'` instead of waiting for the browser to time out.
 */
export function useEventSource(url: string | null) {
  const [data, setData] = useState<unknown>(null);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('closed');
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;
    setStatus('connecting');
    const es = new EventSource(url);
    sourceRef.current = es;

    const handleData = (e: MessageEvent<string>) => {
      const raw = typeof e.data === 'string' ? e.data : String(e.data);
      try {
        setData(JSON.parse(raw));
      } catch {
        setData(raw);
      }
    };
    const onShutdown = () => {
      setStatus('closed');
      es.close();
    };

    es.onopen = () => setStatus('open');
    es.onmessage = handleData;
    // Live events are dispatched as a named `event` type by the API route.
    es.addEventListener('event', handleData);
    // The server announces shutdowns; close the socket instead of hanging.
    es.addEventListener('shutdown', onShutdown);
    es.onerror = () => {
      // Network drop — the server may be restarting. Mark closed so callers
      // can surface a reconnect affordance.
      setStatus('closed');
      es.close();
    };

    return () => {
      es.removeEventListener('event', handleData);
      es.removeEventListener('shutdown', onShutdown);
      es.close();
    };
  }, [url]);

  const close = useCallback(() => {
    sourceRef.current?.close();
    setStatus('closed');
  }, []);

  return { data, status, close };
}
