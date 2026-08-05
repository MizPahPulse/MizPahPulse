import { z } from 'zod';
export const AppConfigSchema = z.object({
  appName: z.string().default('MizPahPulse'),
  appVersion: z.string().default('0.2.0'),
  apiVersion: z.string().default('v1'),
  maxPageSize: z.number().int().positive().default(100),
  defaultPageSize: z.number().int().positive().default(50),
  maxEventBufferSize: z.number().int().positive().default(100),
  wsReconnectDelay: z.number().int().positive().default(1000),
  wsMaxReconnectAttempts: z.number().int().positive().default(10),
});
export type AppConfig = z.infer<typeof AppConfigSchema>;
export const defaultConfig: AppConfig = AppConfigSchema.parse({});
