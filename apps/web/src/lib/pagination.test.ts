import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  buildPaginationArgs,
  paginatedResponse,
  parsePagination,
} from './pagination';

describe('parsePagination', () => {
  it('uses defaults when no parameters are present', () => {
    expect(parsePagination(new URLSearchParams())).toEqual({
      limit: DEFAULT_PAGE_SIZE,
      cursor: undefined,
      sortOrder: 'desc',
    });
  });

  it('parses a valid limit, cursor, and sort order', () => {
    const params = new URLSearchParams({
      limit: '20',
      cursor: 'abc',
      sort: 'asc',
    });
    expect(parsePagination(params)).toEqual({
      limit: 20,
      cursor: 'abc',
      sortOrder: 'asc',
    });
  });

  it('falls back to the default for missing, NaN, zero, or negative limits', () => {
    for (const value of ['x', '0', '-1']) {
      expect(parsePagination(new URLSearchParams({ limit: value })).limit).toBe(DEFAULT_PAGE_SIZE);
    }
  });

  it('caps the limit at the maximum page size', () => {
    expect(parsePagination(new URLSearchParams({ limit: '500' })).limit).toBe(MAX_PAGE_SIZE);
  });

  it('falls back to desc for an unknown sort order', () => {
    expect(parsePagination(new URLSearchParams({ sort: 'sideways' })).sortOrder).toBe('desc');
  });
});

describe('buildPaginationArgs', () => {
  it('fetches limit plus one when no cursor is present', () => {
    const params = parsePagination(new URLSearchParams({ limit: '20', sort: 'asc' }));
    expect(buildPaginationArgs({ scope: 'x' }, params)).toEqual({
      where: { scope: 'x' },
      orderBy: { timestamp: 'asc' },
      take: 21,
    });
  });

  it('adds a cursor and skips the cursor row', () => {
    const params = parsePagination(new URLSearchParams({ limit: '20', cursor: 'abc' }));
    const args = buildPaginationArgs({}, params);
    expect(args.cursor).toEqual({ id: 'abc' });
    expect(args.skip).toBe(1);
    expect(args.take).toBe(21);
  });

  it('uses a custom order-by field', () => {
    const params = parsePagination(new URLSearchParams({ limit: '20' }));
    expect(buildPaginationArgs({}, params, 'createdAt').orderBy).toEqual({
      createdAt: 'desc',
    });
  });
});

describe('paginatedResponse', () => {
  const params = parsePagination(new URLSearchParams({ limit: '2' }));

  it('returns hasMore with a cursor when more items exist', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(paginatedResponse(items, 3, params)).toEqual({
      data: [{ id: 'a' }, { id: 'b' }],
      total: 3,
      limit: 2,
      cursor: 'b',
      hasMore: true,
    });
  });

  it('returns all items without a cursor when the page is complete', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    expect(paginatedResponse(items, 2, params)).toEqual({
      data: items,
      total: 2,
      limit: 2,
      cursor: undefined,
      hasMore: false,
    });
  });

  it('returns an empty page without a cursor', () => {
    expect(paginatedResponse([], 0, params)).toEqual({
      data: [],
      total: 0,
      limit: 2,
      cursor: undefined,
      hasMore: false,
    });
  });
});
