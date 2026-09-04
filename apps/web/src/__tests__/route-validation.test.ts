/**
 * Route tests for the zod query validation added to the remaining unvalidated
 * v1 endpoints (issue #32): contracts/[id]/events and accounts/[id]/activity.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  rateLimit: vi.fn(async () => null),
}));

import { GET as ContractEventsGET } from '@/app/api/v1/contracts/[id]/events/route';
import { GET as ActivityGET } from '@/app/api/v1/accounts/[id]/activity/route';

const VALID_CONTRACT_ID = 'CC4HXCVIOPUOS2UJFLTM6WP2ESNSWM4BGJ26XR4SRRVB74TOZMC7EE2C';
const VALID_PUBLIC_KEY = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

const event = (id: string) => ({
  id,
  eventType: 'PAYMENT',
  category: 'PAYMENT',
  timestamp: new Date('2026-01-01T00:00:00.000Z'),
  accountId: VALID_PUBLIC_KEY,
  ledgerSequence: BigInt(123456),
  payload: {},
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.event.findMany.mockResolvedValue([]);
  prismaMock.event.count.mockResolvedValue(0);
});

describe('GET /api/v1/contracts/[id]/events (#32)', () => {
  it('accepts valid event-type filters', async () => {
    prismaMock.event.findMany.mockResolvedValue([event('evt_1')]);
    prismaMock.event.count.mockResolvedValue(1);

    const res = await ContractEventsGET(
      new Request(
        `http://localhost:3000/api/v1/contracts/${VALID_CONTRACT_ID}/events?eventType=PAYMENT&eventType=DEX_TRADE`,
      ),
      { params: Promise.resolve({ id: VALID_CONTRACT_ID }) },
    );
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          contractId: VALID_CONTRACT_ID,
          eventType: { in: ['PAYMENT', 'DEX_TRADE'] },
        },
      }),
    );
  });

  it('rejects more than 20 event-type filters', async () => {
    const types = Array.from({ length: 21 }, (_, i) => `eventType=t${i}`).join('&');
    const res = await ContractEventsGET(
      new Request(`http://localhost:3000/api/v1/contracts/${VALID_CONTRACT_ID}/events?${types}`),
      { params: Promise.resolve({ id: VALID_CONTRACT_ID }) },
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(prismaMock.event.findMany).not.toHaveBeenCalled();
  });

  it('rejects empty event-type values', async () => {
    const res = await ContractEventsGET(
      new Request(`http://localhost:3000/api/v1/contracts/${VALID_CONTRACT_ID}/events?eventType=`),
      { params: Promise.resolve({ id: VALID_CONTRACT_ID }) },
    );

    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/accounts/[id]/activity (#32)', () => {
  it('returns activity with cursor pagination support', async () => {
    prismaMock.event.findMany.mockResolvedValue([event('evt_1'), event('evt_2')]);
    prismaMock.event.count.mockResolvedValue(5);

    const res = await ActivityGET(
      new Request(
        `http://localhost:3000/api/v1/accounts/${VALID_PUBLIC_KEY}/activity?limit=10&cursor=evt_0&sort=asc`,
      ),
      { params: Promise.resolve({ id: VALID_PUBLIC_KEY }) },
    );
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.events).toHaveLength(2);
    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: VALID_PUBLIC_KEY },
        orderBy: { timestamp: 'asc' },
        take: 11,
        cursor: { id: 'evt_0' },
        skip: 1,
      }),
    );
  });

  it('rejects a non-numeric limit with 400 VALIDATION_ERROR', async () => {
    const res = await ActivityGET(
      new Request(`http://localhost:3000/api/v1/accounts/${VALID_PUBLIC_KEY}/activity?limit=abc`),
      { params: Promise.resolve({ id: VALID_PUBLIC_KEY }) },
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an out-of-range limit', async () => {
    const res = await ActivityGET(
      new Request(`http://localhost:3000/api/v1/accounts/${VALID_PUBLIC_KEY}/activity?limit=999`),
      { params: Promise.resolve({ id: VALID_PUBLIC_KEY }) },
    );

    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid sort order', async () => {
    const res = await ActivityGET(
      new Request(
        `http://localhost:3000/api/v1/accounts/${VALID_PUBLIC_KEY}/activity?sort=sideways`,
      ),
      { params: Promise.resolve({ id: VALID_PUBLIC_KEY }) },
    );

    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid Stellar public key', async () => {
    const res = await ActivityGET(
      new Request('http://localhost:3000/api/v1/accounts/not-a-key/activity'),
      { params: Promise.resolve({ id: 'not-a-key' }) },
    );

    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });
});
