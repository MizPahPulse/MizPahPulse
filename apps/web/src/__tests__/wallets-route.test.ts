/**
 * Tests for GET/POST /api/v1/wallets (issue #49).
 *
 * Covers the monitored-wallet list shape (including the `lastSyncedAt` value
 * surfaced by the ingester), pagination, registration of a new wallet with a
 * validated Stellar public key, duplicate detection, and rate limiting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  monitoredWallet: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
}));

vi.mock('@mizpah-pulse/database', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
}));

const apiKeyMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-key', () => ({
  requireApiKey: apiKeyMock,
}));

import { GET, POST } from '@/app/api/v1/wallets/route';

const VALID_KEY_1 = 'GAJB5URQSW6DA5LZLMEIXOZWGSZTUO25OGJQOKSKPYWMOHUKRKLKAOSZ';
const VALID_KEY_2 = 'GDOC4DGUZKVXW3YA4OHYHFQ3QXPRFGBI2GN2B4SRLTSTUZ2COWCD23GO';

function wallet(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wal-1',
    userId: 'default',
    publicKey: VALID_KEY_1,
    label: 'Treasury',
    network: 'TESTNET',
    isActive: true,
    notificationEnabled: true,
    tags: '["treasury"]',
    lastSyncedAt: new Date('2026-09-04T11:30:00.000Z'),
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-04T11:30:00.000Z'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMock.mockResolvedValue({ limited: false, headers: {}, response: null });
  apiKeyMock.mockResolvedValue({ response: null });
  prismaMock.monitoredWallet.findMany.mockResolvedValue([wallet()]);
  prismaMock.monitoredWallet.count.mockResolvedValue(1);
});

describe('GET /api/v1/wallets', () => {
  it('lists monitored wallets with lastSyncedAt and parsed tags', async () => {
    prismaMock.monitoredWallet.findMany.mockResolvedValue([
      wallet(),
      wallet({ id: 'wal-2', publicKey: VALID_KEY_2, label: null, lastSyncedAt: null }),
    ]);
    prismaMock.monitoredWallet.count.mockResolvedValue(2);

    const res = await GET(new Request('http://localhost:3000/api/v1/wallets'), {});
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.data).toHaveLength(2);
    expect(body.data.data[0]).toEqual(
      expect.objectContaining({
        id: 'wal-1',
        publicKey: VALID_KEY_1,
        lastSyncedAt: '2026-09-04T11:30:00.000Z',
        tags: ['treasury'],
      }),
    );
    expect(body.data.data[1].lastSyncedAt).toBeNull();
    expect(body.data.pagination).toEqual({ page: 1, limit: 50, total: 2, totalPages: 1 });

    expect(prismaMock.monitoredWallet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'default' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      }),
    );
  });

  it('paginates with page/limit and a custom userId', async () => {
    prismaMock.monitoredWallet.count.mockResolvedValue(23);
    const res = await GET(
      new Request('http://localhost:3000/api/v1/wallets?page=3&limit=5&userId=demo-user'),
      {},
    );
    const body = await res.json();

    expect(prismaMock.monitoredWallet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'demo-user' },
        take: 5,
        skip: 10,
      }),
    );
    expect(body.data.pagination).toEqual({ page: 3, limit: 5, total: 23, totalPages: 5 });
  });

  it('returns 429 when rate limited', async () => {
    rateLimitMock.mockResolvedValue({
      limited: true,
      headers: {},
      response: new Response('Too Many Requests', { status: 429 }),
    });

    const res = await GET(new Request('http://localhost:3000/api/v1/wallets'), {});
    expect(res.status).toBe(429);
    expect(prismaMock.monitoredWallet.findMany).not.toHaveBeenCalled();
  });

  it('returns an empty list when nothing is monitored', async () => {
    prismaMock.monitoredWallet.findMany.mockResolvedValue([]);
    prismaMock.monitoredWallet.count.mockResolvedValue(0);

    const res = await GET(new Request('http://localhost:3000/api/v1/wallets'), {});
    const body = await res.json();
    expect(body.data.data).toEqual([]);
    expect(body.data.pagination.total).toBe(0);
  });
});

describe('POST /api/v1/wallets', () => {
  it('registers a wallet and returns the created row', async () => {
    prismaMock.monitoredWallet.create.mockResolvedValue(wallet({ label: 'Ops' }));

    const res = await POST(
      new Request('http://localhost:3000/api/v1/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: VALID_KEY_1, label: 'Ops' }),
      }),
      {},
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual(expect.objectContaining({ id: 'wal-1', publicKey: VALID_KEY_1 }));

    expect(prismaMock.monitoredWallet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'default',
          publicKey: VALID_KEY_1,
          label: 'Ops',
          network: 'TESTNET',
        }),
      }),
    );
  });

  it('rejects an invalid Stellar public key', async () => {
    const res = await POST(
      new Request('http://localhost:3000/api/v1/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: 'not-a-key' }),
      }),
      {},
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(prismaMock.monitoredWallet.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate registration with 409', async () => {
    prismaMock.monitoredWallet.create.mockRejectedValue({ code: 'P2002' });

    const res = await POST(
      new Request('http://localhost:3000/api/v1/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: VALID_KEY_2 }),
      }),
      {},
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe('CONFLICT');
  });

  it('returns 401 when an invalid API key is presented', async () => {
    apiKeyMock.mockResolvedValue({ response: new Response('Unauthorized', { status: 401 }) });

    const res = await POST(
      new Request('http://localhost:3000/api/v1/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: VALID_KEY_1 }),
      }),
      {},
    );
    expect(res.status).toBe(401);
    expect(prismaMock.monitoredWallet.create).not.toHaveBeenCalled();
  });
});
