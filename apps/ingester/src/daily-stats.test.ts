import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  startOfUtcDay,
  rollupDailyStats,
  rollupPreviousDay,
  type DailyStatsDb,
} from './daily-stats';

test('startOfUtcDay floors to UTC midnight', () => {
  const ts = new Date('2026-09-04T12:34:56.789Z');
  assert.equal(startOfUtcDay(ts).toISOString(), '2026-09-04T00:00:00.000Z');
  // Already midnight stays put.
  assert.equal(
    startOfUtcDay(new Date('2026-09-04T00:00:00.000Z')).toISOString(),
    '2026-09-04T00:00:00.000Z',
  );
  // A numeric timestamp works too.
  assert.equal(
    startOfUtcDay(Date.UTC(2026, 8, 4, 23, 59, 59)).toISOString(),
    '2026-09-04T00:00:00.000Z',
  );
});

function makeFakeDb() {
  const upserts: Array<{ date: Date; category: string; eventType: string; count: number }> = [];
  const db: DailyStatsDb = {
    event: {
      groupBy: async ({ where }) => {
        const rows = [
          { category: 'PAYMENT', eventType: 'PAYMENT', _count: { _all: 12 } },
          { category: 'PAYMENT', eventType: 'PATH_PAYMENT', _count: { _all: 5 } },
          { category: 'CONTRACT', eventType: 'CONTRACT_CALL', _count: { _all: 3 } },
        ];
        // Respect the injected window so "no events that day" is testable.
        const day = where.timestamp.gte.toISOString().slice(0, 10);
        if (day === '2026-09-03') return [];
        return rows;
      },
    },
    dailyStat: {
      upsert: async ({ create }) => {
        upserts.push(create);
        return create;
      },
    },
  };
  return { db, upserts };
}

test('rollupDailyStats upserts one row per (category, eventType) with counts', async () => {
  const { db, upserts } = makeFakeDb();
  const result = await rollupDailyStats(new Date('2026-09-04T15:00:00Z'), db);

  assert.equal(result.day.toISOString(), '2026-09-04T00:00:00.000Z');
  assert.equal(result.buckets, 3);
  assert.equal(upserts.length, 3);
  assert.deepEqual(upserts, [
    {
      date: new Date('2026-09-04T00:00:00.000Z'),
      category: 'PAYMENT',
      eventType: 'PAYMENT',
      count: 12,
    },
    {
      date: new Date('2026-09-04T00:00:00.000Z'),
      category: 'PAYMENT',
      eventType: 'PATH_PAYMENT',
      count: 5,
    },
    {
      date: new Date('2026-09-04T00:00:00.000Z'),
      category: 'CONTRACT',
      eventType: 'CONTRACT_CALL',
      count: 3,
    },
  ]);
});

test('rollupDailyStats is a no-op for a day with no events', async () => {
  const { db, upserts } = makeFakeDb();
  const result = await rollupDailyStats(new Date('2026-09-03T10:00:00Z'), db);
  assert.equal(result.buckets, 0);
  assert.equal(upserts.length, 0);
});

test('rollupPreviousDay targets the previous UTC day', async () => {
  const { db, upserts } = makeFakeDb();
  const result = await rollupPreviousDay(new Date('2026-09-04T02:00:00Z'), db);
  // 2026-09-03 has no events in the fake, but the day must still be yesterday.
  assert.equal(result.day.toISOString(), '2026-09-03T00:00:00.000Z');
  assert.equal(result.buckets, 0);
  assert.equal(upserts.length, 0);
});
