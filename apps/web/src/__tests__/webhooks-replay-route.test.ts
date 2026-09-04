/**
 * Tests for POST /api/v1/webhooks/[id]/deliveries/[deliveryId]/replay (#35).
 *
 * Covers re-queueing a FAILED delivery (status → PENDING, attempt reset),
 * rejection of non-FAILED deliveries, inactive-webhook rejection, 404s, and
 * rate limiting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  webhookDelivery: { findFirst: vi.fn(), update: vi.fn() },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock('@mizpah-pulse/database', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
}));

import { POST } from '@/app/api/v1/webhooks/[id]/deliveries/[deliveryId]/replay/route';

function failedDelivery() {
  return {
    id: 'del-9',
    subscriptionId: 'wh-1',
    eventId: 'evt-1',
    status: 'FAILED',
    statusCode: 500,
    attempt: 3,
    payload: { type: 'PAYMENT' },
    response: null,
    error: 'HTTP 500: Internal Server Error',
    createdAt: new Date('2026-09-04T09:00:00.000Z'),
    updatedAt: new Date('2026-09-04T09:00:05.000Z'),
    completedAt: new Date('2026-09-04T09:00:05.000Z'),
    subscription: { isActive: true },
  };
}

function replayRequest(id = 'wh-1', deliveryId = 'del-9', key?: string) {
  const headers: Record<string, string> = {};
  if (key) headers.authorization = `Bearer ${key}`;
  return POST(
    new Request(`http://localhost:3000/api/v1/webhooks/${id}/deliveries/${deliveryId}/replay`, {
      method: 'POST',
      headers,
    }),
    { params: Promise.resolve({ id, deliveryId }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.webhookDelivery.findFirst.mockResolvedValue(failedDelivery());
  prismaMock.webhookDelivery.update.mockImplementation(
    async (args: { where: { id: string }; data: Record<string, unknown> }) => ({
      ...failedDelivery(),
      ...args.data,
    }),
  );
  rateLimitMock.mockResolvedValue({ limited: false, headers: {}, response: null });
});

describe('POST /api/v1/webhooks/[id]/deliveries/[deliveryId]/replay', () => {
  it('re-queues a FAILED delivery as PENDING with a reset attempt', async () => {
    const res = await replayRequest();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('PENDING');
    expect(body.data.attempt).toBe(0);
    expect(body.data.error).toBeNull();

    expect(prismaMock.webhookDelivery.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'del-9', subscriptionId: 'wh-1' },
        include: { subscription: { select: { isActive: true } } },
      }),
    );
    expect(prismaMock.webhookDelivery.update).toHaveBeenCalledWith({
      where: { id: 'del-9' },
      data: expect.objectContaining({
        status: 'PENDING',
        attempt: 0,
        error: null,
        statusCode: null,
        completedAt: null,
      }),
    });
  });

  it('returns 404 when the delivery does not exist for this webhook', async () => {
    prismaMock.webhookDelivery.findFirst.mockResolvedValue(null);

    const res = await replayRequest();
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('rejects deliveries that are not FAILED with a 409', async () => {
    prismaMock.webhookDelivery.findFirst.mockResolvedValue({
      ...failedDelivery(),
      status: 'SUCCESS',
    });

    const res = await replayRequest();
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toContain('Only FAILED deliveries');
  });

  it('rejects replaying deliveries of an inactive webhook with a 409', async () => {
    prismaMock.webhookDelivery.findFirst.mockResolvedValue({
      ...failedDelivery(),
      subscription: { isActive: false },
    });

    const res = await replayRequest();
    expect(res.status).toBe(409);
    expect(prismaMock.webhookDelivery.update).not.toHaveBeenCalled();
  });

  it('validates that a delivery id is present', async () => {
    const res = await replayRequest('wh-1', '');
    expect(res.status).toBe(400);
    expect(prismaMock.webhookDelivery.findFirst).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    rateLimitMock.mockResolvedValue({
      limited: true,
      headers: {},
      response: new Response('Too Many Requests', { status: 429 }),
    });

    const res = await replayRequest();
    expect(res.status).toBe(429);
  });

  it('rejects an invalid API key with 401 before touching the delivery (#28)', async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue(null);

    const res = await replayRequest('wh-1', 'del-1', 'mp_live_bogusnotinanytable');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(prismaMock.webhookDelivery.findFirst).not.toHaveBeenCalled();
  });
});
