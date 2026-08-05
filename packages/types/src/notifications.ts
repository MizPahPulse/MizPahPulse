import { z } from 'zod';
import { EventType } from './events';

/**
 * Notification channel types
 */
export const NotificationChannel = z.enum(['websocket', 'email', 'push', 'slack']);

export type NotificationChannel = z.infer<typeof NotificationChannel>;

/**
 * User notification preferences
 */
export const NotificationPreferenceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  channels: z.array(NotificationChannel).default(['websocket']),
  events: z.array(EventType).default([]),
  enabled: z.boolean().default(true),
  minSeverity: z.enum(['INFO', 'WARNING', 'CRITICAL']).default('INFO'),
  quietHours: z
    .object({
      start: z.string(),
      end: z.string(),
      timezone: z.string().default('UTC'),
    })
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;

/**
 * Notification template for rendering user-facing messages
 */
export const NotificationTemplateSchema = z.object({
  id: z.string(),
  eventType: EventType,
  title: z.string(),
  body: z.string(),
  category: z.string(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  actionUrl: z.string().optional(),
  data: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
});

export type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>;
