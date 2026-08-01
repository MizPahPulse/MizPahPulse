import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/contracts/[id]/events
 *
 * Fetch paginated events for a specific Soroban contract.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const cursor = searchParams.get('cursor') || undefined;

  try {
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where: { contractId: id },
        orderBy: { timestamp: 'desc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.event.count({ where: { contractId: id } }),
    ]);

    const hasMore = events.length > limit;
    const data = hasMore ? events.slice(0, limit) : events;

    return NextResponse.json({
      success: true,
      data: {
        events: data.map((e) => ({
          ...e,
          ledgerSequence: e.ledgerSequence.toString(),
        })),
        total,
        limit,
        cursor: hasMore ? data[data.length - 1]?.id : undefined,
        hasMore,
      },
      meta: { timestamp: new Date().toISOString(), version: 'v1' },
    });
  } catch (error) {
    console.error('[API] Contract events error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch contract events' } },
      { status: 500 },
    );
  }
}
