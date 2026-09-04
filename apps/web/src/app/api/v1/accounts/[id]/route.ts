import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { successResponse, errorResponse, ErrorCode, createRequestId } from '@/lib/api-errors';
import { isValidPublicKey } from '@mizpah-pulse/stellar';
import { withRequestId } from '@/lib/request-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function GETHandler(request: Request, props: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get('X-Request-ID') ?? createRequestId();
  try {
    const { id } = await props.params;
    if (!isValidPublicKey(id)) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid Stellar public key');
    }

    const [totalEvents, recentEvents, paymentCount, contractCount] = await Promise.all([
      prisma.event.count({ where: { accountId: id } }),
      prisma.event.findMany({ where: { accountId: id }, orderBy: { timestamp: 'desc' }, take: 10 }),
      prisma.event.count({ where: { accountId: id, category: 'PAYMENT' } }),
      prisma.event.count({ where: { accountId: id, category: 'CONTRACT' } }),
    ]);

    return successResponse(
      {
        publicKey: id,
        totalEvents,
        payments: paymentCount,
        contractInteractions: contractCount,
        recentEvents: recentEvents.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          category: e.category,
          timestamp: e.timestamp,
        })),
      },
      undefined,
      undefined,
      { 'X-Request-ID': requestId },
    );
  } catch (error) {
    console.error('[API] Account error:', error);
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to fetch account', undefined, requestId);
  }
}

export const GET = withRequestId(GETHandler);
