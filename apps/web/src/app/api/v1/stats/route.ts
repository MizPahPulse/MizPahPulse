import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/stats
 *
 * Aggregate network statistics and platform metrics.
 */
export async function GET() {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalEvents, eventsLastHour, eventsLast24h, categoryBreakdown, uniqueAccounts24h, uniqueContracts24h] =
      await Promise.all([
        prisma.event.count(),
        prisma.event.count({ where: { timestamp: { gte: oneHourAgo } } }),
        prisma.event.count({ where: { timestamp: { gte: twentyFourHoursAgo } } }),
        prisma.event.groupBy({
          by: ['category'],
          _count: true,
          where: { timestamp: { gte: twentyFourHoursAgo } },
        }),
        prisma.event.groupBy({
          by: ['accountId'],
          where: { timestamp: { gte: twentyFourHoursAgo }, accountId: { not: null } },
          _count: true,
        }).then((r) => r.length),
        prisma.event.groupBy({
          by: ['contractId'],
          where: { timestamp: { gte: twentyFourHoursAgo }, contractId: { not: null } },
          _count: true,
        }).then((r) => r.length),
      ]);

    const categories = categoryBreakdown.reduce<Record<string, number>>((acc, c) => {
      acc[c.category] = c._count;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        network: 'TESTNET',
        stats: {
          totalEvents,
          eventsLastHour,
          eventsLast24h,
          eventsPerSecond: Math.round((eventsLastHour / 3600) * 10) / 10,
          uniqueAccounts24h,
          uniqueContracts24h,
          categories,
        },
      },
      meta: { timestamp: now.toISOString(), version: 'v1' },
    });
  } catch (error) {
    console.error('[API] Stats error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' } },
      { status: 500 },
    );
  }
}
