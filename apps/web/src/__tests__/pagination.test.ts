import { describe, it, expect } from 'vitest';
import {
  parsePagination,
  buildPaginationArgs,
  paginatedResponse,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type PaginationParams,
} from '@/lib/pagination';

describe('parsePagination', () => {
  it('returns defaults when no params are provided', () => {
    const params = parsePagination(new URLSearchParams());
    expect(params).toEqual({
      limit: DEFAULT_PAGE_SIZE,
      cursor: undefined,
      sortOrder: 'desc',
    });
  });

  it('parses a valid limit, cursor, and sort order', () => {
    const params = parsePagination(new URLSearchParams('limit=25&cursor=abc123&sort=asc'));
    expect(params).toEqual({ limit: 25, cursor: 'abc123', sortOrder: 'asc' });
  });

  it('falls back to the default limit for non-numeric input', () => {
    expect(parsePagination(new URLSearchParams('limit=abc')).limit).toBe(DEFAULT_PAGE_SIZE);
  });

  it('falls back to the default limit for zero and negative limits', () => {
    expect(parsePagination(new URLSearchParams('limit=0')).limit).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePagination(new URLSearchParams('limit=-5')).limit).toBe(DEFAULT_PAGE_SIZE);
  });

  it('caps the limit at MAX_PAGE_SIZE', () => {
    expect(parsePagination(new URLSearchParams('limit=500')).limit).toBe(MAX_PAGE_SIZE);
  });

  it('keeps a limit exactly at the page size cap', () => {
    expect(parsePagination(new URLSearchParams(`limit=${MAX_PAGE_SIZE}`)).limit).toBe(
      MAX_PAGE_SIZE,
    );
  });

  it('treats an empty cursor value as absent', () => {
    expect(parsePagination(new URLSearchParams('cursor=')).cursor).toBeUndefined();
  });

  it('defaults to descending sort order', () => {
    expect(parsePagination(new URLSearchParams('sort=')).sortOrder).toBe('desc');
    expect(parsePagination(new URLSearchParams('limit=10')).sortOrder).toBe('desc');
  });
});

describe('buildPaginationArgs', () => {
  const where = { eventType: 'payment' };

  it('builds args without a cursor', () => {
    const params: PaginationParams = { limit: 20, sortOrder: 'desc' };
    expect(buildPaginationArgs(where, params)).toEqual({
      where,
      orderBy: { timestamp: 'desc' },
      take: 21, // limit + 1 to detect hasMore
    });
  });

  it('adds a cursor and skip when a cursor is provided', () => {
    const params: PaginationParams = { limit: 20, cursor: 'evt_9', sortOrder: 'desc' };
    expect(buildPaginationArgs(where, params)).toEqual({
      where,
      orderBy: { timestamp: 'desc' },
      take: 21,
      cursor: { id: 'evt_9' },
      skip: 1,
    });
  });

  it('respects a custom order-by field and ascending order', () => {
    const params: PaginationParams = { limit: 10, sortOrder: 'asc' };
    expect(buildPaginationArgs(where, params, 'createdAt').orderBy).toEqual({
      createdAt: 'asc',
    });
  });
});

describe('paginatedResponse', () => {
  const items = [
    { id: '1', value: 'a' },
    { id: '2', value: 'b' },
    { id: '3', value: 'c' },
  ];

  it('truncates to the limit and exposes the next cursor when more items exist', () => {
    const params: PaginationParams = { limit: 2, sortOrder: 'desc' };
    const result = paginatedResponse(items, 100, params);
    expect(result).toEqual({
      data: [
        { id: '1', value: 'a' },
        { id: '2', value: 'b' },
      ],
      total: 100,
      limit: 2,
      cursor: '2',
      hasMore: true,
    });
  });

  it('returns all items and no cursor when the page is exactly full', () => {
    const params: PaginationParams = { limit: 3, sortOrder: 'desc' };
    const result = paginatedResponse(items, 3, params);
    expect(result.data).toHaveLength(3);
    expect(result.cursor).toBeUndefined();
    expect(result.hasMore).toBe(false);
  });

  it('returns all items and no cursor when fewer items than the limit exist', () => {
    const params: PaginationParams = { limit: 10, sortOrder: 'desc' };
    const result = paginatedResponse(items, 3, params);
    expect(result.data).toEqual(items);
    expect(result.cursor).toBeUndefined();
    expect(result.hasMore).toBe(false);
  });

  it('handles an empty result set', () => {
    const params: PaginationParams = { limit: 50, sortOrder: 'desc' };
    const result = paginatedResponse([], 0, params);
    expect(result).toEqual({
      data: [],
      total: 0,
      limit: 50,
      cursor: undefined,
      hasMore: false,
    });
  });
});
