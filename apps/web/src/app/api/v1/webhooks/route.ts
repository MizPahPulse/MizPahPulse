import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { EventType } from '@mizpah-pulse/types';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { errorResponse, successResponse, ErrorCode } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateWebhookSchema = z.object({
  endpoint: z.string().url('Must be a valid HTTPS URL'),
  events: z.array(EventType).min(1, 'At least one event type is required'),
  secret: z.string().min(16, 'Secret must be at least 16 characters').optional(),
  userId: z.string().optional().default('default'),
});

/**
 * Mask a signing secret so it can never be fully exposed through the API.
 * Secrets are only shown once at creation time in real webhook platforms;
 * here we return a stable placeholder so clients can detect that a secret exists.
 */
function maskSecret(secret: string): string {
  const prefix = secret.startsWith('whsec_') ? 'whsec_' : '';
  return `${prefix}${'\u2022'.repeat(12)}`;
}

/**
 * Strip the raw secret from a webhook record and attach a masked placeholder.
 */
function sanitizeWebhook(w: {
  secret?: string | null;
  [key: string]: unknown;
}): Record<string, unknown> {
  const { secret, ...rest } = w;
  return {
    ...rest,
    secretMasked: secret ? maskSecret(secret) : null,
  };
}

/**
 * GET /api/v1/webhooks
 *
 * List all registered webhooks.
 */
async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'default';

  const webhooks = await prisma.webhookSubscription.findMany({
    where: { userId },
    include: { deliveries: { take: 5, orderBy: { createdAt: 'desc' } } },
  });

  return successResponse(
    webhooks.map((w: { events: unknown; secret?: string | null; [key: string]: unknown }) =>
      sanitizeWebhook({ ...w, events: JSON.parse(w.events as string) }),
    ),
  );
}

/**
 * POST /api/v1/webhooks
 *
 * Register a new webhook endpoint.
 */
async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 10,
    windowMs: 60_000,
    keyPrefix: 'webhooks:create',
  });
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const parsed = CreateWebhookSchema.parse(body);

    // Validate the endpoint accepts HTTPS in production
    if (process.env.NODE_ENV === 'production' && !parsed.endpoint.startsWith('https://')) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Webhook endpoints must use HTTPS in production',
      );
    }

    const webhook = await prisma.webhookSubscription.create({
      data: {
        userId: parsed.userId || 'default',
        endpoint: parsed.endpoint,
        events: JSON.stringify(parsed.events),
        secret: parsed.secret || `whsec_${uuidv4()}`,
      },
    });

    return successResponse(
      sanitizeWebhook({
        ...webhook,
        events: JSON.parse(webhook.events as string),
      }),
      201,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid webhook configuration',
        error.flatten() as unknown as Record<string, unknown>,
      );
    }
    console.error('[API] Webhook create error:', error);
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to create webhook');
  }
}

export { GET, POST };
