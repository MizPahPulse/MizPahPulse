/**
 * Tests for GET /api/v1/transactions/[hash] (issue #42).
 *
 * Covers DB-first status resolution (success/failed/pending), the Horizon
 * fallback (success + not-found on 404), unreachable-Horizon degradation,
 * hash validation, rate limiting, and API-key enforcement.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const HASH = 'abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1';

const prismaMock = vi.hoisted(() => ({
  transaction: { findUnique: vi.fn() },
}));

vi.mock('@mizpah-pulse/database', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
}));

const requireApiKeyMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-key', () => ({
  requireApiKey: requireApiKeyMock,
}));

const fetchTransactionMock = vi.hoisted(() => vi.fn());
vi.mock('@mizpah-pulse/stellar', () => ({
  fetchTransaction: fetchTransactionMock,
}));

import { GET } from '@/app/api/v1/transactions/[hash]/route';

function tx(overrides: Record<string, unknown> = {}) {
  return {
    hash: HASH,
    sourceAccount: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    fee: '100',
    operationCount: 1,
    memo: null,
    successful: true,
    resultCode: null,
    ledgerSequence: BigInt(42000),
    createdAt: new Date('2026-09-04T10:00:00.000Z'),
    envelopeXdr: 'AAAAAgAAAAB',
    resultXdr: 'AAAAAAAAAAA=',
    ...overrides,
  };
}

function statusRequest(hash: string) {
  return GET(new Request(`http://localhost:3000/api/v1/transactions/${hash}`), {
    params: Promise.resolve({ hash }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.transaction.findUnique.mockResolvedValue(null);
  rateLimitMock.mockResolvedValue({ limited: false, headers: {}, response: null });
  requireApiKeyMock.mockResolvedValue({ response: null });
});

describe('GET /api/v1/transactions/[hash]', () => {
  it('returns success for an indexed, successful transaction', async () => {
    prismaMock.transaction.findUnique.mockResolvedValue(tx());

    const res = await statusRequest(HASH);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('success');
    expect(body.data.hash).toBe(HASH);
    expect(body.data.resultXdr).toBe('AAAAAAAAAAA=');
    expect(body.data.ledgerSequence).toBe('42000');
    expect(prismaMock.transaction.findUnique).toHaveBeenCalledWith({
      where: { hash: HASH },
    });
  });

  it('returns failed for an indexed transaction that did not succeed', async () => {
    prismaMock.transaction.findUnique.mockResolvedValue(
      tx({ successful: false, resultCode: 'tx_bad_seq' }),
    );

    const res = await statusRequest(HASH);
    const body = await res.json();
    expect(body.data.status).toBe('failed');
    expect(body.data.resultCode).toBe('tx_bad_seq');
  });

  it('returns pending when the indexed transaction has no result XDR yet', async () => {
    prismaMock.transaction.findUnique.mockResolvedValue(tx({ resultXdr: null }));

    const res = await statusRequest(HASH);
    const body = await res.json();
    expect(body.data.status).toBe('pending');
  });

  it('falls back to Horizon when the transaction is not indexed locally', async () => {
    fetchTransactionMock.mockResolvedValue({
      successful: true,
      result_xdr: 'AAAAAAAAABc=',
      envelope_xdr: 'AAAAAQ==',
    });

    const res = await statusRequest(HASH);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.status).toBe('success');
    expect(body.data.source).toBe('horizon');
    expect(body.data.resultXdr).toBe('AAAAAAAAABc=');
    expect(fetchTransactionMock).toHaveBeenCalledWith(HASH);
  });

  it('reports failed for a Horizon record that did not succeed', async () => {
    fetchTransactionMock.mockResolvedValue({ successful: false });

    const res = await statusRequest(HASH);
    const body = await res.json();
    expect(body.data.status).toBe('failed');
    expect(body.data.source).toBe('horizon');
  });

  it('returns status not-found when Horizon answers 404', async () => {
    const notFound = new Error('not found') as Error & { response?: { status: number } };
    notFound.response = { status: 404 };
    fetchTransactionMock.mockRejectedValue(notFound);

    const res = await statusRequest(HASH);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.status).toBe('not-found');
  });

  it('degrades with a 503 when Horizon is unreachable', async () => {
    fetchTransactionMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await statusRequest(HASH);
    expect(res.status).toBe(503);
  });

  it('rejects a malformed hash with a 400', async () => {
    const res = await statusRequest('not-a-hash');
    expect(res.status).toBe(400);
    expect(prismaMock.transaction.findUnique).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    rateLimitMock.mockResolvedValue({
      limited: true,
      headers: {},
      response: new Response('Too Many Requests', { status: 429 }),
    });

    const res = await statusRequest(HASH);
    expect(res.status).toBe(429);
  });

  it('honors API-key enforcement responses', async () => {
    requireApiKeyMock.mockResolvedValue({
      response: new Response('Unauthorized', { status: 401 }),
    });

    const res = await statusRequest(HASH);
    expect(res.status).toBe(401);
  });
});
