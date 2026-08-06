import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, rateLimitMock, validatorsMock } = vi.hoisted(() => ({
  prismaMock: {
    event: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
  rateLimitMock: vi.fn(),
  validatorsMock: {
    isValidPublicKey: vi.fn(),
    isValidContractId: vi.fn(),
    isValidTransactionHash: vi.fn(),
  },
}));

vi.mock('@mizpah-pulse/database', () => ({
  prisma: prismaMock,
}));

vi.mock('@mizpah-pulse/stellar', () => validatorsMock);

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('@/lib/monitoring', () => ({
  recordRequest: vi.fn(),
}));

import { GET } from '../route';

function request(q: string): Request {
  return new Request(`http://localhost/api/v1/search?q=${encodeURIComponent(q)}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMock.mockResolvedValue(null);
  validatorsMock.isValidPublicKey.mockReturnValue(false);
  validatorsMock.isValidContractId.mockReturnValue(false);
  validatorsMock.isValidTransactionHash.mockReturnValue(false);
  prismaMock.event.findMany.mockResolvedValue([]);
  prismaMock.event.count.mockResolvedValue(0);
  prismaMock.event.findFirst.mockResolvedValue(null);
});

describe('GET /api/v1/search', () => {
  it('returns account results for a valid public key', async () => {
    validatorsMock.isValidPublicKey.mockReturnValue(true);
    prismaMock.event.count.mockResolvedValue(3);

    const response = await GET(request('GABC123456789'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.results.accounts[0].eventCount).toBe(3);
    expect(body.data.results.accounts[0].publicKey).toBe('GABC123456789');
  });

  it('returns contract results for a valid contract id', async () => {
    validatorsMock.isValidContractId.mockReturnValue(true);
    prismaMock.event.count.mockResolvedValue(5);

    const response = await GET(request('CABC123456789'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.results.contracts[0].contractId).toBe('CABC123456789');
    expect(body.data.results.contracts[0].eventCount).toBe(5);
  });

  it('returns a validation error for a short query', async () => {
    const response = await GET(request('x'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns text matches for a plain query', async () => {
    prismaMock.event.findMany.mockResolvedValueOnce([
      {
        id: 'event-1',
        ledgerSequence: 123,
        eventType: 'PAYMENT',
        accountId: 'G...',
        timestamp: '2026-08-06T18:00:00.000Z',
      },
    ]);

    const response = await GET(request('payment'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.results.events[0].id).toBe('event-1');
    expect(body.data.results.events[0].ledgerSequence).toBe('123');
  });
});
