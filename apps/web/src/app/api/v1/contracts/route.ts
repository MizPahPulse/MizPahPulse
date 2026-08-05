import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { successResponse, errorResponse, ErrorCode, createRequestId } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const contracts = await prisma.event.groupBy({
      by: ['contractId'],
      where: { contractId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const result = contracts.map((c) => ({
      contractId: c.contractId,
      eventCount: c._count.id,
    }));

    return successResponse(result, undefined, undefined, { 'X-Request-ID': requestId });
  } catch (error) {
    console.error('[API] Contracts error:', error);
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch contracts',
      undefined,
      requestId,
    );
  }
}
