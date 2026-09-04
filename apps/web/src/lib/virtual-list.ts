'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Fixed-height windowing for the live feed (issue #12).
 *
 * The feed can hold up to 100 events and previously rendered every row;
 * this keeps DOM nodes bounded to the visible window plus a small overscan.
 * The math is a pure function (`getVirtualRange`) so it is trivially testable;
 * the hook just feeds it scroll position + viewport height from the DOM.
 */

export const DEFAULT_ROW_HEIGHT = 88;
export const DEFAULT_ROW_GAP = 8;
export const DEFAULT_OVERSCAN = 4;

/**
 * jsdom reports `clientHeight` as 0, and the first paint has no layout yet.
 * Falling back to a minimum viewport keeps the initial window sensible in
 * both tests and before the browser measures the container.
 */
export const MIN_VIEWPORT_HEIGHT = 360;

export interface VirtualRange {
  /** Index of the first rendered row (inclusive). */
  startIndex: number;
  /** Index of the last rendered row (inclusive); -1 when there are no rows. */
  endIndex: number;
  /** Pixel offset from the top of the scroll content to the window. */
  startOffset: number;
  /** Pixel height of the trailing spacer below the window. */
  endOffset: number;
  /** Total scroll content height in pixels. */
  totalHeight: number;
}

export interface GetVirtualRangeOptions {
  scrollTop: number;
  viewportHeight: number;
  itemCount: number;
  rowHeight?: number;
  gap?: number;
  overscan?: number;
}

/**
 * Compute which rows are visible for a given scroll position.
 *
 * Rows are laid out at a fixed stride (rowHeight + gap). The window starts a
 * few rows above the first visible one and ends a few rows below, so scrolling
 * feels seamless. All bounds are clamped to [0, itemCount).
 */
export function getVirtualRange({
  scrollTop,
  viewportHeight,
  itemCount,
  rowHeight = DEFAULT_ROW_HEIGHT,
  gap = DEFAULT_ROW_GAP,
  overscan = DEFAULT_OVERSCAN,
}: GetVirtualRangeOptions): VirtualRange {
  if (itemCount <= 0) {
    return { startIndex: 0, endIndex: -1, startOffset: 0, endOffset: 0, totalHeight: 0 };
  }

  const stride = rowHeight + gap;
  const effectiveViewport = Math.max(viewportHeight, MIN_VIEWPORT_HEIGHT);
  const totalHeight = itemCount * rowHeight + (itemCount - 1) * gap;

  const firstVisibleIndex = Math.max(0, Math.floor(scrollTop / stride));
  const visibleCount = Math.ceil(effectiveViewport / stride) + 1;

  const endIndex = Math.min(itemCount - 1, firstVisibleIndex + visibleCount + overscan);
  // Clamp the window start so scrolling far past the last row still leaves a
  // full (shifted) window rendered instead of an empty slice.
  const startIndex = Math.max(
    0,
    Math.min(firstVisibleIndex - overscan, endIndex - visibleCount - overscan),
  );

  const startOffset = startIndex * stride;
  const windowBottom = (endIndex + 1) * rowHeight + endIndex * gap;
  const endOffset = Math.max(0, totalHeight - windowBottom);

  return { startIndex, endIndex, startOffset, endOffset, totalHeight };
}

export interface UseVirtualListOptions {
  itemCount: number;
  rowHeight?: number;
  gap?: number;
  overscan?: number;
}

export interface UseVirtualListResult {
  /** Attach to the scrollable container. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Scroll handler for the container. */
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  /** The current visible window. */
  range: VirtualRange;
}

/**
 * Track a scrollable container's position and size, returning the visible
 * window of rows. Rows should be rendered as:
 *
 *   <div style={{ height: range.totalHeight, position: 'relative' }}>
 *     <div style={{ transform: translateY(range.startOffset) }}>
 *       {items.slice(range.startIndex, range.endIndex + 1).map(renderRow)}
 *     </div>
 *   </div>
 */
export function useVirtualList({
  itemCount,
  rowHeight = DEFAULT_ROW_HEIGHT,
  gap = DEFAULT_ROW_GAP,
  overscan = DEFAULT_OVERSCAN,
}: UseVirtualListOptions): UseVirtualListResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateHeight = () => setViewportHeight(el.clientHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const range = getVirtualRange({
    scrollTop,
    viewportHeight,
    itemCount,
    rowHeight,
    gap,
    overscan,
  });

  return {
    containerRef,
    onScroll: (event: React.UIEvent<HTMLDivElement>) => setScrollTop(event.currentTarget.scrollTop),
    range,
  };
}
