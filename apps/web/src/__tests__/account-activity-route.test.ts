/**
 * Integration tests for GET /api/v1/accounts/[id]/activity (issue #31).
 *
 * The endpoint's cursor pagination contract: responses include a `cursor`
 * (the last returned event id) and `hasMore` when additional rows exist, and
 * the client can page through every event without skipping or duplicating.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

const prismaMock = vi.hoisted(() => ({
  event: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock('@mizpah-pulse/database', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(async () => ({ limited: false, headers: {}, response: null })),
}));

vi.mock('@mizpah-pulse/stellar', () => ({
  // Mimic the real validation: a valid Stellar public key starts with 'G'
  // and is 56 chars; anything else is rejected.
  isValidPublicKey: vi.fn((key: string) => /^G[1-9A-HJ-NP-Za-km-z]{55}$/.test(key)),
}));

import { GET } from '@/app/api/v1/accounts/[id]/activity/route';

const ACCOUNT = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const event = (id: string, ts: string) => ({
  id,
  eventType: 'PAYMENT',
  source: 'horizon',
  category: 'PAYMENT',
  severity: 'INFO',
  transactionHash: 'a'.repeat(64),
  ledgerSequence: BigInt(123456),
  pagingToken: `123456-${id}`,
  timestamp: new Date(ts),
  accountId: ACCOUNT,
  contractId: null,
  assetCode: null,
  assetIssuer: null,
  amount: '125',
  payload: '{"memo":"hi"}',
});

function activityRequest(query = '', accountId = ACCOUNT) {
  return GET(new Request(`http://localhost:3000/api/v1/accounts/${accountId}/activity${query}`), {
    params: Promise.resolve({ id: accountId }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.event.findMany.mockResolvedValue([]);
  prismaMock.event.count.mockResolvedValue(0);
});

describe('GET /api/v1/accounts/[id]/activity', () => {
  it('returns a next cursor with hasMore when more rows exist', async () => {
    // limit=2 → fetch 3 rows (limit+1) → hasMore, cursor = last returned id.
    prismaMock.event.findMany.mockResolvedValue([
      event('evt_1', '2026-09-04T10:00:00.000Z'),
      event('evt_2', '2026-09-04T09:00:00.000Z'),
      event('evt_3', '2026-09-04T08:00:00.000Z'),
    ]);
    prismaMock.event.count.mockResolvedValue(5);

    const res = await activityRequest('?limit=2');
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data.limit).toBe(2);
    expect(body.data.hasMore).toBe(true);
    expect(body.data.cursor).toBe('evt_2');
    expect(body.data.events).toHaveLength(2);
    expect(body.data.events.map((e: { id: string }) => e.id)).toEqual(['evt_1', 'evt_2']);
  });

  it('omits the cursor when the last page is reached', async () => {
    prismaMock.event.findMany.mockResolvedValue([
      event('evt_1', '2026-09-04T10:00:00.000Z'),
      event('evt_2', '2026-09-04T09:00:00.000Z'),
    ]);
    prismaMock.event.count.mockResolvedValue(2);

    const res = await activityRequest('?limit=2');
    const body = await res.json();

    expect(body.data.hasMore).toBe(false);
    expect(body.data.cursor).toBeUndefined();
    expect(body.data.events).toHaveLength(2);
  });

  it('lets a client page through all events without skipping or duplicating', async () => {
    const all = [
      event('evt_1', '2026-09-04T10:00:00.000Z'),
      event('evt_2', '2026-09-04T09:00:00.000Z'),
      event('evt_3', '2026-09-04T08:00:00.000Z'),
      event('evt_4', '2026-09-04T07:00:00.000Z'),
      event('evt_5', '2026-09-04T06:00:00.000Z'),
    ];
    prismaMock.event.findMany.mockImplementation(async (args: { cursor?: { id: string } }) => {
      const cursorId = args.cursor?.id;
      const start = cursorId ? all.findIndex((e) => e.id === cursorId) + 1 : 0;
      return all.slice(start, start + 3); // limit=2 → limit+1 = 3
    });
    prismaMock.event.count.mockResolvedValue(5);

    // Page 1
    const page1 = await (await activityRequest('?limit=2')).json();
    expect(page1.data.cursor).toBe('evt_2');
    expect(page1.data.hasMore).toBe(true);

    // Page 2 continues after the cursor — no overlap, no gap.
    const page2 = await (await activityRequest(`?limit=2&cursor=${page1.data.cursor}`)).json();
    expect(page2.data.cursor).toBe('evt_4');
    expect(page2.data.hasMore).toBe(true);
    const seen = new Set(
      [...page1.data.events, ...page2.data.events].map((e: { id: string }) => e.id),
    );
    expect(seen.size).toBe(4);

    // Page 3 drains the remaining rows.
    const page3 = await (await activityRequest(`?limit=2&cursor=${page2.data.cursor}`)).json();
    expect(page3.data.hasMore).toBe(false);
    const allIds = [...seen, ...page3.data.events.map((e: { id: string }) => e.id)];
    expect(allIds).toEqual(['evt_1', 'evt_2', 'evt_3', 'evt_4', 'evt_5']);
  });

  it('rejects an invalid Stellar public key', async () => {
    const res = await activityRequest('', 'not-a-valid-key');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects out-of-range limit values', async () => {
    const res = await activityRequest('?limit=0');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
