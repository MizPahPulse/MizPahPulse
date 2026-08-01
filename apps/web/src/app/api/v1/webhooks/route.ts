import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { EventType } from '@mizpah-pulse/types';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateWebhookSchema = z.object({
  endpoint: z.string().url(),
  events: z.array(EventType).min(1),
  secret: z.string().min(16).optional(),
});

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

  return NextResponse.json({
    success: true,
    data: webhooks.map((w: { events: unknown; [key: string]: unknown }) => ({
      ...w,
      events: JSON.parse(w.events as string),
    })),
    meta: { timestamp: new Date().toISOString(), version: 'v1' },
  });
}

/**
 * POST /api/v1/webhooks
 *
 * Register a new webhook endpoint.
 */
async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CreateWebhookSchema.parse(body);

    const webhook = await prisma.webhookSubscription.create({
      data: {
        userId: 'default',
        endpoint: parsed.endpoint,
        events: JSON.stringify(parsed.events),
        secret: parsed.secret || `whsec_${uuidv4()}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...webhook,
        events: JSON.parse(webhook.events as string),
      },
      meta: { timestamp: new Date().toISOString(), version: 'v1' },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid webhook configuration', details: error.flatten() } },
        { status: 400 },
      );
    }
    console.error('[API] Webhook create error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create webhook' } },
      { status: 500 },
    );
  }
}

export { GET, POST };
