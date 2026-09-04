import { prisma } from '@mizpah-pulse/database';
import { generateWebhookSecret } from '@mizpah-pulse/stellar';
import { errorResponse, successResponse, ErrorCode, createRequestId } from '@/lib/api-errors';
import { requireApiKey } from '@/lib/api-key';
import { prismaErrorResponse } from '@/lib/prisma-errors';
import { rateLimit } from '@/lib/rate-limit';
import { sanitizeWebhook } from '@/lib/webhook-utils';
import { withRequestId } from '@/lib/request-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/webhooks/[id]/rotate-secret
 *
 * Rotate a webhook's signing secret (issue #36). A fresh `whsec_` secret is
 * generated with `generateWebhookSecret` and persisted immediately, so the old
 * secret stops verifying as soon as this request succeeds. The new secret is
 * returned exactly once — the sanitized webhook in the same payload only ever
 * carries the masked placeholder, matching every other webhook endpoint.
 */
async function POSTHandler(request: Request, props: { params: Promise<{ id: string }> }) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 10,
    windowMs: 60_000,
    keyPrefix: 'webhooks:rotate-secret',
  });
  if (rateLimitResult.limited) return rateLimitResult.response!;

  const auth = await requireApiKey(request);
  if (auth.response) return auth.response;

  const requestId = request.headers.get('X-Request-ID') ?? createRequestId();

  try {
    const { id } = await props.params;

    const existing = await prisma.webhookSubscription.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Webhook not found', undefined, requestId);
    }

    const secret = generateWebhookSecret();

    const updated = await prisma.webhookSubscription.update({
      where: { id },
      data: { secret },
    });

    return successResponse(
      {
        secret,
        rotatedAt: updated.updatedAt,
        webhook: sanitizeWebhook({
          ...updated,
          events: JSON.parse(updated.events as string),
        }),
      },
      200,
      undefined,
      { 'X-Request-ID': requestId, ...rateLimitResult.headers },
    );
  } catch (error) {
    return prismaErrorResponse(error, 'Failed to rotate webhook secret', requestId);
  }
}

export const POST = withRequestId(POSTHandler);
