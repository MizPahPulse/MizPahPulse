import { prisma } from '@mizpah-pulse/database';
import { errorResponse, successResponse, ErrorCode, createRequestId } from '@/lib/api-errors';
import { requireApiKey } from '@/lib/api-key';
import { prismaErrorResponse } from '@/lib/prisma-errors';
import { rateLimit } from '@/lib/rate-limit';
import { withRequestId } from '@/lib/request-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/webhooks/[id]/deliveries/[deliveryId]/replay
 *
 * Manually re-queue a FAILED webhook delivery (issue #35). The delivery is
 * reset to PENDING with a fresh attempt counter so the ingester worker
 * (`apps/ingester/src/webhook-worker.ts`) picks it up on its next poll — that
 * poll loop is the queue, so no separate broker is involved.
 *
 * Only FAILED deliveries can be replayed (successful ones need no retry, and
 * PENDING/RETRYING ones are already queued). Replaying against an inactive
 * subscription is rejected because the worker skips inactive webhooks and the
 * delivery would silently stall.
 */
async function POSTHandler(
  request: Request,
  props: { params: Promise<{ id: string; deliveryId: string }> },
) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 20,
    windowMs: 60_000,
    keyPrefix: 'webhooks:replay',
  });
  if (rateLimitResult.limited) return rateLimitResult.response!;

  const auth = await requireApiKey(request);
  if (auth.response) return auth.response;

  const requestId = request.headers.get('X-Request-ID') ?? createRequestId();

  try {
    const { id, deliveryId } = await props.params;

    if (!deliveryId) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Delivery id is required',
        undefined,
        requestId,
      );
    }

    // Load the delivery scoped to this webhook subscription. The worker only
    // processes deliveries whose subscription is active, so surface that state
    // here instead of silently queueing a delivery that can never be sent.
    const delivery = await prisma.webhookDelivery.findFirst({
      where: { id: deliveryId, subscriptionId: id },
      include: {
        subscription: {
          select: { isActive: true },
        },
      },
    });

    if (!delivery) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Delivery not found', undefined, requestId);
    }

    if (delivery.status !== 'FAILED') {
      return errorResponse(
        ErrorCode.CONFLICT,
        `Only FAILED deliveries can be replayed (current status: ${delivery.status})`,
        undefined,
        requestId,
      );
    }

    if (!delivery.subscription.isActive) {
      return errorResponse(
        ErrorCode.CONFLICT,
        'Cannot replay a delivery for an inactive webhook — activate the webhook first',
        undefined,
        requestId,
      );
    }

    const updated = await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'PENDING',
        attempt: 0,
        error: null,
        response: null,
        statusCode: null,
        completedAt: null,
      },
    });

    return successResponse(updated, 200, undefined, {
      'X-Request-ID': requestId,
      ...rateLimitResult.headers,
    });
  } catch (error) {
    return prismaErrorResponse(error, 'Failed to replay webhook delivery', requestId);
  }
}

export const POST = withRequestId(POSTHandler);
