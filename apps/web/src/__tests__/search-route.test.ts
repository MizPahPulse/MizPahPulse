import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * API route tests for GET /api/v1/search (issue #89).
 *
 * The Prisma client is mocked so every search branch can be exercised without
 * a database, and the rate limiter is mocked so tests are never throttled.
 */

const prismaMock = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}));

vi.mock('@mizpah-pulse/database', () => ({
  prisma: { event: prismaMock },
  default: { event: prismaMock },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(async () => null),
}));

import { GET } from '@/app/api/v1/search/route';

const VALID_PUBLIC_KEY = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const VALID_CONTRACT_ID = 'CC4HXCVIOPUOS2UJFLTM6WP2ESNSWM4BGJ26XR4SRRVB74TOZMC7EE2C';
const VALID_TX_HASH = 'a'.repeat(64);

const event = (overrides: Record<string, unknown> = {}) => ({
  id: 'evt_01',
  eventType: 'payment',
  transactionHash: VALID_TX_HASH,
  accountId: VALID_PUBLIC_KEY,
  contractId: null,
  assetCode: null,
  ledgerSequence: 123456,
  timestamp: new Date('2026-01-01T00:00:00.000Z'),
  payload: {},
  ...overrides,
});

async function search(query: string) {
  return GET(new Request(`http://localhost:3000/api/v1/search?q=${encodeURIComponent(query)}`));
}

beforeEach(() => {
  vi.clearAllMocks();
  // The route always runs a full-text pass after the format-specific branches,
  // so default the mocks to empty results and override per test.
  prismaMock.findFirst.mockResolvedValue(null);
  prismaMock.findMany.mockResolvedValue([]);
  prismaMock.count.mockResolvedValue(0);
});

describe('GET /api/v1/search', () => {
  it('returns a validation error for queries shorter than 2 characters', async () => {
    const res = await search('a');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(prismaMock.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.findMany).not.toHaveBeenCalled();
  });

  it('returns account results for a valid G… public key', async () => {
    prismaMock.findMany.mockResolvedValue([event()]);
    prismaMock.count.mockResolvedValue(42);

    const res = await search(VALID_PUBLIC_KEY);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.query).toBe(VALID_PUBLIC_KEY);
    expect(body.data.results.accounts).toHaveLength(1);
    expect(body.data.results.accounts[0]).toMatchObject({
      publicKey: VALID_PUBLIC_KEY,
      eventCount: 42,
    });
    expect(prismaMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountId: VALID_PUBLIC_KEY } }),
    );
    expect(prismaMock.count).toHaveBeenCalledWith({ where: { accountId: VALID_PUBLIC_KEY } });
  });

  it('returns contract results for a valid C… contract id', async () => {
    prismaMock.findMany.mockResolvedValue([]);
    prismaMock.count.mockResolvedValue(7);

    const res = await search(VALID_CONTRACT_ID);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.results.contracts).toHaveLength(1);
    expect(body.data.results.contracts[0]).toMatchObject({
      contractId: VALID_CONTRACT_ID,
      eventCount: 7,
    });
  });

  it('returns a transaction result when the query is a transaction hash', async () => {
    prismaMock.findFirst.mockResolvedValue(event({ eventType: 'payment' }));

    const res = await search(VALID_TX_HASH);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.results.transactions).toEqual([
      { hash: VALID_TX_HASH, found: true, eventType: 'payment', timestamp: expect.anything() },
    ]);
  });

  it('omits the transactions bucket when a hash is not found', async () => {
    prismaMock.findFirst.mockResolvedValue(null);

    const res = await search(VALID_TX_HASH);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.results.transactions).toBeUndefined();
    expect(body.data.totalResults).toBe(0);
  });

  it('runs a full-text search for free-form queries', async () => {
    prismaMock.findMany.mockResolvedValue([
      event({ id: 'evt_1', eventType: 'payment' }),
      event({ id: 'evt_2', eventType: 'payment' }),
    ]);

    const res = await search('payment');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.results.events).toHaveLength(2);
    expect(body.data.totalResults).toBe(2);
    expect(prismaMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { eventType: { contains: 'payment', mode: 'insensitive' } },
            { accountId: { contains: 'payment', mode: 'insensitive' } },
            { assetCode: { contains: 'payment', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });

  it('returns an empty result set when nothing matches', async () => {
    prismaMock.findMany.mockResolvedValue([]);

    const res = await search('zzz-no-such-thing');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.results).toEqual({});
    expect(body.data.totalResults).toBe(0);
  });

  it('returns a structured 500 when the database query fails', async () => {
    prismaMock.findMany.mockRejectedValue(new Error('connection refused'));

    const res = await search('payment');
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Search failed');
  });
});
