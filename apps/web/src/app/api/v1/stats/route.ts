import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Simple in-memory cache
let cachedStats: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

/**
 * GET /api/v1/stats
 *
 * Aggregated dashboard statistics with caching.
 */
export async function GET() {
  try {
    const now = Date.now();
    if (cachedStats && now - cachedStats.timestamp < CACHE_TTL) {
      return NextResponse.json(
        { ...(cachedStats.data as object), cached: true },
        { headers: { 'X-Cache': 'HIT' } },
      );
    }

    const [totalEvents, eventCount24h, recentEvents, uniqueAccounts, contractCount] =
      await Promise.all([
        prisma.event.count(),
        prisma.event.count({
          where: {
            timestamp: { gte: new Date(now - 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.event.findMany({
          orderBy: { timestamp: 'desc' },
          take: 5,
          select: {
            id: true,
            eventType: true,
            category: true,
            timestamp: true,
            accountId: true,
          },
        }),
        prisma.event.groupBy({
          by: ['accountId'],
          _count: true,
          orderBy: { _count: { accountId: 'desc' } },
          take: 1,
        }).then((r) => r[0]?._count ?? 0),
        prisma.event.groupBy({
          by: ['contractId'],
          where: { contractId: { not: null } },
          _count: true,
        }).then((r) => r.length),
      ]);

    const stats = {
      totalEvents,
      eventsLast24h: eventCount24h,
      uniqueAccounts: uniqueAccounts,
      trackedContracts: contractCount,
      recentActivity: recentEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        category: e.category,
        timestamp: e.timestamp,
        accountId: e.accountId,
      })),
    };

    cachedStats = { data: stats, timestamp: now };

    return successResponse(stats, 200, { cached: false });
  } catch (error) {
    console.error('[API] Stats error:', error);
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to fetch statistics');
  }
}
