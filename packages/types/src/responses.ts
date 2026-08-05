import { z } from 'zod';
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({ code: z.string(), message: z.string(), details: z.record(z.unknown()).optional() }).optional(),
  meta: z.object({ timestamp: z.string(), version: z.string(), requestId: z.string().optional() }).optional(),
});
export type ApiResponse<T = unknown> = { success: boolean; data?: T; error?: { code: string; message: string; details?: Record<string, unknown> }; meta?: { timestamp: string; version: string; requestId?: string } };
