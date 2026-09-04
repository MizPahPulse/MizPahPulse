/**
 * DailyStat rollup (issue #47).
 *
 * Aggregates raw Event rows into the pre-aggregated `DailyStat` table so the
 * stats API can serve day-level analytics without scanning raw events.
 *
 * A day is always a UTC day (midnight-to-midnight). Rollups are idempotent:
 * running the same day twice upserts the same totals.
 */

import { prisma } from '@mizpah-pulse/database';

export const DAILY_STATS_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

/** Minimal Prisma surface used by the rollup (injectable for tests). */
export interface DailyStatsDb {
  event: {
    groupBy(args: {
      by: ('category' | 'eventType')[];
      where: { timestamp: { gte: Date; lt: Date } };
      _count: { _all: true };
    }): Promise<Array<{ category: string; eventType: string; _count: { _all: number } }>>;
  };
  dailyStat: {
    upsert(args: {
      where: { date_category_eventType: { date: Date; category: string; eventType: string } };
      create: { date: Date; category: string; eventType: string; count: number };
      update: { count: number };
    }): Promise<unknown>;
  };
}

export interface RollupResult {
  day: Date;
  buckets: number;
}

/** Floor a timestamp to UTC midnight. */
export function startOfUtcDay(ts: Date | number): Date {
  const ms = typeof ts === 'number' ? ts : ts.getTime();
  return new Date(Math.floor(ms / 86_400_000) * 86_400_000);
}

/**
 * Roll up one UTC day of events into DailyStat rows.
 *
 * @param day - Any timestamp within the target UTC day (floored internally).
 * @returns Summary of how many (category, eventType) buckets were upserted.
 */
export async function rollupDailyStats(
  day: Date | number,
  db: DailyStatsDb = prisma as unknown as DailyStatsDb,
): Promise<RollupResult> {
  const dayStart = startOfUtcDay(day);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const groups = await db.event.groupBy({
    by: ['category', 'eventType'],
    where: { timestamp: { gte: dayStart, lt: dayEnd } },
    _count: { _all: true },
  });

  let buckets = 0;
  for (const group of groups) {
    await db.dailyStat.upsert({
      where: {
        date_category_eventType: {
          date: dayStart,
          category: group.category,
          eventType: group.eventType,
        },
      },
      create: {
        date: dayStart,
        category: group.category,
        eventType: group.eventType,
        count: group._count._all,
      },
      update: { count: group._count._all },
    });
    buckets += 1;
  }

  return { day: dayStart, buckets };
}

/** Roll up the previous UTC day (the standard "catch up" run). */
export async function rollupPreviousDay(
  now: Date = new Date(),
  db: DailyStatsDb = prisma as unknown as DailyStatsDb,
): Promise<RollupResult> {
  const yesterday = new Date(startOfUtcDay(now).getTime() - 86_400_000);
  return rollupDailyStats(yesterday, db);
}
