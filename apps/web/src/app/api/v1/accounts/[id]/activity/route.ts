import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { isValidPublicKey } from '@mizpah-pulse/stellar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/accounts/[id]/activity
 *
 * Fetch paginated activity feed for a specific Stellar account.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!isValidPublicKey(id)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ADDRESS', message: 'Invalid Stellar public key' } },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const cursor = searchParams.get('cursor') || undefined;
  const category = searchParams.get('category') || undefined;

  try {
    const where: Record<string, unknown> = { accountId: id };
    if (category) where.category = category;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.event.count({ where }),
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
    console.error('[API] Account activity error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch account activity' } },
      { status: 500 },
    );
  }
}
