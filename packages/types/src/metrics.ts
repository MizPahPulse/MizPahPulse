import { z } from 'zod';

export const MetricsSchema = z.object({
  totalRequests: z.number().int().nonnegative(),
  errorRequests: z.number().int().nonnegative(),
  avgResponseTime: z.number().nonnegative(),
  lastMinuteRequests: z.number().int().nonnegative(),
  uptime: z.number().nonnegative(),
  startTime: z.number().nonnegative(),
  errorRate: z.number().min(0).max(100),
});

export type Metrics = z.infer<typeof MetricsSchema>;
