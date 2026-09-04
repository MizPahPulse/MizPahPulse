/**
 * Time-series aggregation helpers (issue #37), extracted from the route so
 * the bucketing math is unit-testable and Next.js route files only export
 * handlers.
 */

export type Granularity = 'hour' | 'day';
export type TimeseriesRange = '24h' | '7d' | '30d';

export const GRANULARITY_MS: Record<Granularity, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
};

export const RANGE_MS: Record<TimeseriesRange, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

/** Floor a timestamp to the bucket boundary (UTC-aligned so buckets line up at :00). */
export function floorToBucket(ts: number, granularity: Granularity): number {
  return Math.floor(ts / GRANULARITY_MS[granularity]) * GRANULARITY_MS[granularity];
}

function hourLabel(bucketStart: number): string {
  const hours = new Date(bucketStart).getUTCHours();
  return `${String(hours).padStart(2, '0')}:00`;
}

const dayLabelFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export interface TimeseriesBucket {
  start: string;
  label: string;
  counts: Record<string, number>;
  total: number;
}

export interface TimeseriesResult {
  granularity: Granularity;
  range: TimeseriesRange;
  start: string;
  end: string;
  totalEvents: number;
  buckets: TimeseriesBucket[];
}

/**
 * Aggregate raw `(timestamp, category)` rows into a continuous, zero-filled
 * series of buckets.
 */
export function buildTimeseriesBuckets(
  rows: Array<{ timestamp: Date; category: string }>,
  granularity: Granularity,
  range: TimeseriesRange,
  nowMs: number,
): TimeseriesResult {
  const rangeMs = RANGE_MS[range];
  const startMs = floorToBucket(nowMs - rangeMs, granularity);
  const endMs = nowMs;
  const stepMs = GRANULARITY_MS[granularity];

  const perBucket = new Map<number, Map<string, number>>();
  const categories = new Set<string>();
  let totalEvents = 0;

  for (const row of rows) {
    const ts = new Date(row.timestamp).getTime();
    if (ts < startMs || ts > endMs) continue;
    const bucketKey = floorToBucket(ts, granularity);
    const bucket = perBucket.get(bucketKey) ?? new Map<string, number>();
    const count = (bucket.get(row.category) ?? 0) + 1;
    bucket.set(row.category, count);
    perBucket.set(bucketKey, bucket);
    categories.add(row.category);
    totalEvents++;
  }

  const buckets: TimeseriesBucket[] = [];
  for (let t = startMs; t <= endMs; t += stepMs) {
    const bucketCounts = perBucket.get(t) ?? new Map<string, number>();
    const counts: Record<string, number> = {};
    let total = 0;
    // Zero-fill every category seen anywhere in the window so charts have a
    // stable set of keys across buckets.
    for (const category of categories) {
      const count = bucketCounts.get(category) ?? 0;
      counts[category] = count;
      total += count;
    }
    buckets.push({
      start: new Date(t).toISOString(),
      label: granularity === 'hour' ? hourLabel(t) : dayLabelFormatter.format(t),
      counts,
      total,
    });
  }

  return {
    granularity,
    range,
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    totalEvents,
    buckets,
  };
}

/** A row from the pre-aggregated `DailyStat` table (issue #47). */
export interface DailyStatRow {
  date: Date;
  category: string;
  count: number;
}

/**
 * Build day buckets preferring the pre-aggregated `DailyStat` table (issue
 * #47), falling back to raw events for any day not yet rolled up (typically
 * today). This avoids double counting: raw rows whose UTC day is at or
 * before `lastRollupDay` are already reflected in the stats and are skipped.
 *
 * Only meaningful for `granularity === 'day'`; callers should keep using
 * `buildTimeseriesBuckets` for hour-level series.
 */
export function buildDailyStatBuckets(
  statRows: DailyStatRow[],
  rawRows: Array<{ timestamp: Date; category: string }>,
  range: TimeseriesRange,
  nowMs: number,
): TimeseriesResult {
  const granularity: Granularity = 'day';
  const rangeMs = RANGE_MS[range];
  const startMs = floorToBucket(nowMs - rangeMs, granularity);
  const endMs = nowMs;
  const stepMs = GRANULARITY_MS.day;

  // Sum DailyStat counts per (day, category).
  const statByDay = new Map<number, Map<string, number>>();
  let lastRollupDay = 0;
  const categories = new Set<string>();
  for (const row of statRows) {
    const dayMs = floorToBucket(new Date(row.date).getTime(), 'day');
    const byCat = statByDay.get(dayMs) ?? new Map<string, number>();
    byCat.set(row.category, (byCat.get(row.category) ?? 0) + row.count);
    statByDay.set(dayMs, byCat);
    categories.add(row.category);
    if (dayMs > lastRollupDay) lastRollupDay = dayMs;
  }

  // Raw events: only those after the last rolled-up day count.
  const perBucket = new Map<number, Map<string, number>>();
  let totalEvents = 0;
  for (const row of rawRows) {
    const ts = new Date(row.timestamp).getTime();
    if (ts < startMs || ts > endMs) continue;
    const bucketKey = floorToBucket(ts, 'day');
    if (bucketKey <= lastRollupDay) continue; // already reflected in stats
    const bucket = perBucket.get(bucketKey) ?? new Map<string, number>();
    const count = (bucket.get(row.category) ?? 0) + 1;
    bucket.set(row.category, count);
    perBucket.set(bucketKey, bucket);
    categories.add(row.category);
    totalEvents++;
  }

  const buckets: TimeseriesBucket[] = [];
  for (let t = startMs; t <= endMs; t += stepMs) {
    const statCounts = statByDay.get(t) ?? new Map<string, number>();
    const rawCounts = perBucket.get(t) ?? new Map<string, number>();
    const counts: Record<string, number> = {};
    let total = 0;
    for (const category of categories) {
      const count = (statCounts.get(category) ?? 0) + (rawCounts.get(category) ?? 0);
      counts[category] = count;
      total += count;
    }
    buckets.push({
      start: new Date(t).toISOString(),
      label: dayLabelFormatter.format(t),
      counts,
      total,
    });
  }

  // totalEvents reflects only raw (not-yet-rolled-up) events; the full total
  // across the window lives in the bucket sums. Keep parity with
  // buildTimeseriesBuckets semantics by reporting the bucket-summed total.
  totalEvents = buckets.reduce((acc, b) => acc + b.total, 0);

  return {
    granularity,
    range,
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    totalEvents,
    buckets,
  };
}
