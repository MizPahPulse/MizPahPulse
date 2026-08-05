'use client';

import { useState, useCallback } from 'react';

export function useClipboard(resetDelay = 2000) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useCallback(
    async (text: string) => {
      setError(null);
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), resetDelay);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to copy');
        return false;
      }
    },
    [resetDelay],
  );

  return { copied, error, copy };
}
