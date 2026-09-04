/**
 * Unit tests for the fixed-height virtualization windowing math (issue #12).
 *
 * Covers small lists (render everything), large lists (bounded window),
 * scrolling (window follows scrollTop), clamping at both ends, trailing
 * spacer offsets, and the empty case.
 */
import { describe, it, expect } from 'vitest';
import {
  getVirtualRange,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_ROW_GAP,
  DEFAULT_OVERSCAN,
} from '@/lib/virtual-list';

describe('getVirtualRange (#12)', () => {
  const stride = DEFAULT_ROW_HEIGHT + DEFAULT_ROW_GAP; // 96

  it('returns an empty window for zero items', () => {
    const range = getVirtualRange({ scrollTop: 0, viewportHeight: 600, itemCount: 0 });
    expect(range.endIndex).toBe(-1);
    expect(range.totalHeight).toBe(0);
    expect(range.startOffset).toBe(0);
    expect(range.endOffset).toBe(0);
  });

  it('renders every row when the list is small', () => {
    const range = getVirtualRange({ scrollTop: 0, viewportHeight: 600, itemCount: 5 });
    expect(range.startIndex).toBe(0);
    expect(range.endIndex).toBe(4);
    expect(range.totalHeight).toBe(5 * DEFAULT_ROW_HEIGHT + 4 * DEFAULT_ROW_GAP);
    expect(range.endOffset).toBe(0);
  });

  it('only renders the visible window (plus overscan) for a large list', () => {
    // 100 rows = 9600px of content; a 600px viewport fits ~7 rows.
    const range = getVirtualRange({ scrollTop: 0, viewportHeight: 600, itemCount: 100 });
    expect(range.startIndex).toBe(0);
    // endIndex = firstVisible(0) + ceil(600/96)+1 + overscan(4) = 7+1+4 = 12
    expect(range.endIndex).toBe(12);
    expect(range.endIndex - range.startIndex + 1).toBeLessThan(100);
    expect(range.totalHeight).toBe(100 * DEFAULT_ROW_HEIGHT + 99 * DEFAULT_ROW_GAP);
    // The trailing spacer fills the rest of the content below the window.
    expect(range.endOffset).toBeGreaterThan(0);
  });

  it('moves the window with scrollTop and clamps near the end', () => {
    // Scroll to ~50% of the content: 9600px * 0.5 = 4800px → row 50.
    const middle = getVirtualRange({ scrollTop: 4800, viewportHeight: 600, itemCount: 100 });
    expect(middle.startIndex).toBeGreaterThan(40);
    expect(middle.startIndex).toBeLessThan(60);
    expect(middle.endIndex).toBeGreaterThan(middle.startIndex);

    // Scrolling far past the end clamps to the last row and still renders a
    // full window (shifted so the last rows are visible).
    const bottom = getVirtualRange({ scrollTop: 100_000, viewportHeight: 600, itemCount: 100 });
    expect(bottom.endIndex).toBe(99);
    expect(bottom.endOffset).toBe(0);
    expect(bottom.startIndex).toBeGreaterThan(80);
    expect(bottom.startIndex).toBeLessThan(99);
  });

  it('keeps the total offset consistent with the rendered window', () => {
    const range = getVirtualRange({ scrollTop: 2400, viewportHeight: 600, itemCount: 100 });
    const renderedHeight =
      (range.endIndex - range.startIndex + 1) * DEFAULT_ROW_HEIGHT +
      (range.endIndex - range.startIndex) * DEFAULT_ROW_GAP;
    expect(range.startOffset + renderedHeight + range.endOffset).toBe(range.totalHeight);
  });

  it('honors custom row height, gap, and overscan', () => {
    const range = getVirtualRange({
      scrollTop: 0,
      viewportHeight: 400,
      itemCount: 50,
      rowHeight: 50,
      gap: 4,
      overscan: 1,
    });
    // stride 54; firstVisible 0; visible = ceil(400/54)+1 = 9; +1 overscan → 10
    expect(range.endIndex).toBe(10);
    expect(DEFAULT_OVERSCAN).toBe(4);
  });
});
