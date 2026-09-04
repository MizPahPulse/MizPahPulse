import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { EventType } from '@mizpah-pulse/types';
import { z } from 'zod';
import { errorResponse, successResponse, ErrorCode, createRequestId } from '@/lib/api-errors';
import { prismaErrorResponse } from '@/lib/prisma-errors';
import { rateLimit } from '@/lib/rate-limit';
import { isPublicWebhookEndpoint } from '@/lib/ssrf';
import { sanitizeWebhook } from '@/lib/webhook-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/v1/webhooks/[id]
 *
 * Update a webhook subscription. Every field is optional so callers can send
 * only what changed; the signing secret is only replaced when one is provided.
 */
const UpdateWebhookSchema = z.object({
  endpoint: z.string().url('Must be a valid URL').optional(),
  events: z.array(EventType).min(1, 'At least one event type is required').optional(),
  secret: z.string().min(16, 'Secret must be at least 16 characters').optional(),
  isActive: z.boolean().optional(),
  maxRetries: z.number().int().min(0, 'maxRetries must be between 0 and 10').max(10).optional(),
  retryDelayMs: z
    .number()
    .int()
    .min(100, 'retryDelayMs must be at least 100ms')
    .max(60000, 'retryDelayMs must be at most 60000ms')
    .optional(),
});

/**
 * DELETE /api/v1/webhooks/[id]
 *
 * Remove a webhook subscription.
 */
export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await props.params;
    const webhook = await prisma.webhookSubscription.findUnique({ where: { id } });
    if (!webhook) return errorResponse(ErrorCode.NOT_FOUND, 'Webhook not found');

    await prisma.webhookSubscription.delete({ where: { id } });
    return successResponse({ deleted: true, id });
  } catch (error) {
    return prismaErrorResponse(error, 'Failed to delete webhook');
  }
}

/**
 * PATCH /api/v1/webhooks/[id]
 *
 * Update a webhook subscription.
 */
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 20,
    windowMs: 60_000,
    keyPrefix: 'webhooks:update',
  });
  if (rateLimitResult) return rateLimitResult;

  const requestId = createRequestId();

  try {
    const { id } = await props.params;

    const body: unknown = await request.json().catch(() => {
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['body'],
          message: 'Request body must be valid JSON',
        },
      ]);
    });

    const parsed = UpdateWebhookSchema.parse(body);

    const existing = await prisma.webhookSubscription.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Webhook not found', undefined, requestId);
    }

    // Re-validate the endpoint when it changes (SSRF guard, mirroring POST).
    if (parsed.endpoint !== undefined && process.env.NODE_ENV !== 'test') {
      const endpointCheck = await isPublicWebhookEndpoint(parsed.endpoint);
      if (!endpointCheck.ok) {
        return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          `Webhook endpoint rejected: ${endpointCheck.reason ?? 'address check failed'}`,
          undefined,
          requestId,
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (parsed.endpoint !== undefined) data.endpoint = parsed.endpoint;
    if (parsed.events !== undefined) data.events = JSON.stringify(parsed.events);
    if (parsed.secret !== undefined) data.secret = parsed.secret;
    if (parsed.isActive !== undefined) data.isActive = parsed.isActive;
    if (parsed.maxRetries !== undefined) data.maxRetries = parsed.maxRetries;
    if (parsed.retryDelayMs !== undefined) data.retryDelayMs = parsed.retryDelayMs;

    const updated = await prisma.webhookSubscription.update({
      where: { id },
      data,
    });

    return successResponse(
      sanitizeWebhook({
        ...updated,
        events: JSON.parse(updated.events as string),
      }),
      undefined,
      undefined,
      { 'X-Request-ID': requestId },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid webhook update',
        error.flatten() as unknown as Record<string, unknown>,
        requestId,
      );
    }
    return prismaErrorResponse(error, 'Failed to update webhook', requestId);
  }
}
