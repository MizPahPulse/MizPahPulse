import { z } from 'zod';

/**
 * Standard API response wrapper
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.unknown()).optional(),
      })
      .optional(),
    meta: z
      .object({
        timestamp: z.string().datetime(),
        version: z.string(),
        requestId: z.string().optional(),
      })
      .optional(),
  });

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
};

/**
 * API key authentication
 */
export const ApiKeySchema = z.object({
  id: z.string(),
  userId: z.string(),
  key: z.string(),
  name: z.string(),
  permissions: z.array(z.string()).default(['read']),
  isActive: z.boolean().default(true),
  lastUsedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

export type ApiKey = z.infer<typeof ApiKeySchema>;

/**
 * SSE event sent to clients
 */
export const LiveEventSchema = z.object({
  channel: z.string(),
  eventType: z.string(),
  data: z.record(z.unknown()),
  timestamp: z.string().datetime(),
  sequence: z.number().int().nonnegative(),
});

export type LiveEvent = z.infer<typeof LiveEventSchema>;
