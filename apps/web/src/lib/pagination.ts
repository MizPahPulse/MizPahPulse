/**
 * Pagination helper for cursor-based paginated endpoints.
 * Standardizes pagination logic across all API routes.
 */

export interface PaginationParams {
  limit: number;
  cursor?: string;
  sortOrder: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  limit: number;
  cursor?: string;
  hasMore: boolean;
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

/**
 * Parse pagination parameters from URL search params.
 */
export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const limitRaw = searchParams.get('limit');
  let limit = limitRaw ? parseInt(limitRaw, 10) : DEFAULT_PAGE_SIZE;

  if (isNaN(limit) || limit < 1) limit = DEFAULT_PAGE_SIZE;
  if (limit > MAX_PAGE_SIZE) limit = MAX_PAGE_SIZE;

  const cursor = searchParams.get('cursor') || undefined;
  const rawSort = searchParams.get('sort');
  const sortOrder = rawSort === 'asc' || rawSort === 'desc' ? rawSort : 'desc';

  return { limit, cursor, sortOrder };
}

/**
 * Build paginated findMany args for Prisma.
 * Fetches limit+1 items to determine hasMore.
 */
export function buildPaginationArgs<T extends Record<string, unknown>>(
  where: T,
  params: PaginationParams,
  orderByField = 'timestamp',
): {
  where: T;
  orderBy: Record<string, string>;
  take: number;
  skip?: number;
  cursor?: { id: string };
} {
  const args: {
    where: T;
    orderBy: Record<string, string>;
    take: number;
    skip?: number;
    cursor?: { id: string };
  } = {
    where,
    orderBy: { [orderByField]: params.sortOrder },
    take: params.limit + 1, // Fetch one extra to determine hasMore
  };

  if (params.cursor) {
    args.cursor = { id: params.cursor };
    args.skip = 1;
  }

  return args;
}

/**
 * Create a paginated response from fetched data.
 */
export function paginatedResponse<T extends { id: string }>(
  items: T[],
  total: number,
  params: PaginationParams,
): PaginationResult<T> {
  const hasMore = items.length > params.limit;
  const data = hasMore ? items.slice(0, params.limit) : items;

  return {
    data,
    total,
    limit: params.limit,
    cursor: hasMore ? data[data.length - 1]?.id : undefined,
    hasMore,
  };
}
