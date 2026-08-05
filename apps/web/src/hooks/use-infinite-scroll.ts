'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseInfiniteScrollOptions {
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Distance from bottom (in px) to trigger load (default 200) */
  threshold?: number;
  /** Callback to load more items */
  onLoadMore: () => void;
}

/**
 * useInfiniteScroll — Triggers a callback when the user scrolls near the bottom.
 * Uses IntersectionObserver for performance.
 */
export function useInfiniteScroll({
  hasMore,
  isLoading,
  threshold = 200,
  onLoadMore,
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [sentinelRef, setSentinelRef] = useState<HTMLDivElement | null>(null);

  const sentinelCallback = useCallback((node: HTMLDivElement | null) => {
    setSentinelRef(node);
  }, []);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!hasMore || isLoading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        rootMargin: `0px 0px ${threshold}px 0px`,
      },
    );

    if (sentinelRef) {
      observerRef.current.observe(sentinelRef);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, isLoading, threshold, onLoadMore, sentinelRef]);

  return { sentinelRef: sentinelCallback };
}
