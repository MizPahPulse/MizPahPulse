import { prisma } from '@mizpah-pulse/database';
import { errorResponse, successResponse, ErrorCode, createRequestId } from '@/lib/api-errors';
import { prismaErrorResponse } from '@/lib/prisma-errors';
import { rateLimit } from '@/lib/rate-limit';
import { withRequestId } from '@/lib/request-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/v1/api-keys/[id]
 *
 * Revoke an API key (issue #18). Revocation is a soft delete — the row is
 * marked inactive so `authenticateApiKey` immediately stops accepting it
 * while the audit trail (name, creation, last use) is preserved. Inactive
 * keys are excluded from list responses.
 */
async function DELETEHandler(request: Request, props: { params: Promise<{ id: string }> }) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 20,
    windowMs: 60_000,
    keyPrefix: 'api-keys:revoke',
  });
  if (rateLimitResult.limited) return rateLimitResult.response!;

  const requestId = request.headers.get('X-Request-ID') ?? createRequestId();

  try {
    const { id } = await props.params;

    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(ErrorCode.NOT_FOUND, 'API key not found', undefined, requestId);
    }

    if (!existing.isActive) {
      return errorResponse(ErrorCode.CONFLICT, 'API key is already revoked', undefined, requestId);
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    return successResponse(
      { id: updated.id, revoked: true, revokedAt: new Date().toISOString() },
      200,
      undefined,
      { 'X-Request-ID': requestId, ...rateLimitResult.headers },
    );
  } catch (error) {
    return prismaErrorResponse(error, 'Failed to revoke API key', requestId);
  }
}

export const DELETE = withRequestId(DELETEHandler);
