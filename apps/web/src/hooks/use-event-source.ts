import { useEffect, useRef, useState, useCallback } from 'react';

export function useEventSource(url: string | null) {
  const [data, setData] = useState<unknown>(null);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('closed');
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;
    setStatus('connecting');
    const es = new EventSource(url);
    sourceRef.current = es;
    es.onopen = () => setStatus('open');
    es.onmessage = (e) => { try { setData(JSON.parse(e.data)); } catch { setData(e.data); } };
    es.onerror = () => { setStatus('closed'); es.close(); };
    return () => es.close();
  }, [url]);

  const close = useCallback(() => { sourceRef.current?.close(); setStatus('closed'); }, []);
  return { data, status, close };
}
