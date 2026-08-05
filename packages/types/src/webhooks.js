import { z } from 'zod';
import { EventType } from './events';
/**
 * Webhook subscription configuration
 */
export const WebhookSubscriptionSchema = z.object({
    id: z.string(),
    userId: z.string(),
    endpoint: z.string().url(),
    secret: z.string(),
    events: z.array(EventType),
    isActive: z.boolean().default(true),
    maxRetries: z.number().int().min(0).max(10).default(3),
    retryDelayMs: z.number().int().min(1000).default(5000),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    lastDeliveryAt: z.string().datetime().optional(),
    failedDeliveries: z.number().int().nonnegative().default(0),
});
/**
 * Webhook delivery attempt
 */
export const WebhookDeliverySchema = z.object({
    id: z.string(),
    subscriptionId: z.string(),
    eventId: z.string(),
    status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'RETRYING']),
    statusCode: z.number().int().optional(),
    attempt: z.number().int().positive(),
    payload: z.record(z.unknown()),
    response: z.string().optional(),
    error: z.string().optional(),
    createdAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
});
/**
 * Webhook event payload sent to subscribers
 */
export const WebhookPayloadSchema = z.object({
    id: z.string(),
    event: z.string(),
    type: EventType,
    timestamp: z.string().datetime(),
    data: z.record(z.unknown()),
    signature: z.string(),
});
//# sourceMappingURL=webhooks.js.map