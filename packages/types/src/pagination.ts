import { z } from 'zod';

export const PaginationParamsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  cursor?: string;
  hasMore: boolean;
}
