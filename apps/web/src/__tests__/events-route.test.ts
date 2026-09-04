/**
 * Integration tests for GET /api/v1/events with a mocked Prisma client (#84).
 *
 * Covers filtering, cursor pagination, response shaping (ledgerSequence and
 * payload normalization), validation errors, rate limiting, and API-key auth.
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

vi.mock('@/lib/api-key', () => ({
  requireApiKey: vi.fn(async () => ({ response: null })),
}));

import { GET } from '@/app/api/v1/events/route';
import { requireApiKey } from '@/lib/api-key';

const event = (overrides: Record<string, unknown> = {}) => ({
  id: 'evt_1',
  eventType: 'PAYMENT',
  source: 'horizon',
  category: 'PAYMENT',
  severity: 'INFO',
  transactionHash: 'a'.repeat(64),
  ledgerSequence: BigInt(123456),
  pagingToken: '123456-1',
  timestamp: new Date('2026-01-01T00:00:00.000Z'),
  accountId: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  contractId: null,
  assetCode: null,
  assetIssuer: null,
  amount: '125',
  payload: '{"memo":"hi"}',
  ...overrides,
});

async function listEvents(query = '') {
  return GET(new Request(`http://localhost:3000/api/v1/events${query}`), undefined);
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.event.findMany.mockResolvedValue([]);
  prismaMock.event.count.mockResolvedValue(0);
  (requireApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({ response: null });
});

describe('GET /api/v1/events', () => {
  it('returns events with normalized payloads and ledger sequences', async () => {
    prismaMock.event.findMany.mockResolvedValue([event(), event({ id: 'evt_2' })]);
    prismaMock.event.count.mockResolvedValue(2);

    const res = await listEvents();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.events).toHaveLength(2);
    expect(body.data.total).toBe(2);
    expect(body.data.limit).toBe(50);
    expect(body.data.hasMore).toBe(false);
    expect(body.data.cursor).toBeUndefined();
    // BigInt ledgerSequence is serialized as a string; payload JSON is parsed.
    expect(body.data.events[0].ledgerSequence).toBe('123456');
    expect(body.data.events[0].payload).toEqual({ memo: 'hi' });
    expect(res.headers.get('X-Request-ID')).toBeTruthy();
  });

  it('applies filters to the Prisma query', async () => {
    prismaMock.event.findMany.mockResolvedValue([event()]);
    prismaMock.event.count.mockResolvedValue(1);

    await listEvents('?eventType=PAYMENT&category=PAYMENT&minLedger=100&q=GABC');

    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventType: { in: ['PAYMENT'] },
          category: { in: ['PAYMENT'] },
          ledgerSequence: { gte: 100 },
          OR: [
            { transactionHash: { contains: 'GABC', mode: 'insensitive' } },
            { accountId: { contains: 'GABC', mode: 'insensitive' } },
            { contractId: { contains: 'GABC', mode: 'insensitive' } },
            { eventType: { contains: 'GABC', mode: 'insensitive' } },
          ],
        },
        orderBy: { timestamp: 'desc' },
        take: 51,
      }),
    );
    expect(prismaMock.event.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: { in: ['PAYMENT'] } }),
      }),
    );
  });

  it('honors cursor pagination with limit', async () => {
    prismaMock.event.findMany.mockResolvedValue([
      event({ id: 'evt_1' }),
      event({ id: 'evt_2' }),
      event({ id: 'evt_3' }),
    ]);
    prismaMock.event.count.mockResolvedValue(10);

    const res = await listEvents('?limit=2&cursor=evt_0');
    const body = await res.json();

    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        cursor: { id: 'evt_0' },
        skip: 1,
      }),
    );
    // Fetched limit+1 items → hasMore true, cursor points at the last returned item.
    expect(body.data.hasMore).toBe(true);
    expect(body.data.cursor).toBe('evt_2');
    expect(body.data.events).toHaveLength(2);
  });

  it('rejects invalid filter values with 400 VALIDATION_ERROR', async () => {
    const res = await listEvents('?limit=abc');
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');

    const res2 = await listEvents('?minLedger=-5');
    expect((await res2.json()).error.code).toBe('VALIDATION_ERROR');

    expect(prismaMock.event.findMany).not.toHaveBeenCalled();
  });

  it('propagates an API-key rejection when required', async () => {
    (requireApiKey as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      response: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } },
        { status: 401 },
      ),
    });

    const res = await listEvents();
    expect(res.status).toBe(401);
    expect(prismaMock.event.findMany).not.toHaveBeenCalled();
  });

  it('propagates the rate-limit response when throttled', async () => {
    const { rateLimit } = await import('@/lib/rate-limit');
    (rateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      limited: true,
      headers: {},
      response: NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
        { status: 429 },
      ),
    });

    const res = await listEvents();
    expect(res.status).toBe(429);
    expect(prismaMock.event.findMany).not.toHaveBeenCalled();
  });
});
