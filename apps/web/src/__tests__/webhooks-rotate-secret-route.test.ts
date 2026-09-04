/**
 * Tests for POST /api/v1/webhooks/[id]/rotate-secret (issue #36).
 *
 * Covers the freshly generated `whsec_` secret being returned exactly once
 * while the sanitized webhook payload never exposes the raw secret, 404s for
 * unknown webhooks, and rate limiting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  webhookSubscription: { findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock('@mizpah-pulse/database', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
}));

const generateWebhookSecretMock = vi.hoisted(() => vi.fn());
vi.mock('@mizpah-pulse/stellar', () => ({
  generateWebhookSecret: generateWebhookSecretMock,
}));

import { POST } from '@/app/api/v1/webhooks/[id]/rotate-secret/route';

function webhook(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wh-1',
    userId: 'default',
    endpoint: 'https://example.com/hook',
    secret: 'whsec_old-secret-value',
    events: '["PAYMENT"]',
    isActive: true,
    maxRetries: 3,
    retryDelayMs: 5000,
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-04T10:00:00.000Z'),
    ...overrides,
  };
}

function rotateRequest(id = 'wh-1') {
  return POST(new Request(`http://localhost:3000/api/v1/webhooks/${id}/rotate-secret`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.webhookSubscription.findUnique.mockResolvedValue(webhook());
  generateWebhookSecretMock.mockReturnValue('whsec_freshly-generated-secret');
  prismaMock.webhookSubscription.update.mockImplementation(
    async (args: { where: { id: string }; data: Record<string, unknown> }) => ({
      ...webhook(),
      ...args.data,
    }),
  );
  rateLimitMock.mockResolvedValue({ limited: false, headers: {}, response: null });
});

describe('POST /api/v1/webhooks/[id]/rotate-secret', () => {
  it('returns the new secret exactly once alongside a sanitized webhook', async () => {
    const res = await rotateRequest();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.secret).toBe('whsec_freshly-generated-secret');
    expect(body.data.rotatedAt).toBe('2026-09-04T10:00:00.000Z');

    // The sanitized webhook must never contain the raw secret.
    expect(body.data.webhook.secret).toBeUndefined();
    expect(body.data.webhook.secretMasked).toBe('whsec_••••••••••••');
    expect(body.data.webhook.events).toEqual(['PAYMENT']);
    expect(generateWebhookSecretMock).toHaveBeenCalledOnce();
    expect(prismaMock.webhookSubscription.update).toHaveBeenCalledWith({
      where: { id: 'wh-1' },
      data: { secret: 'whsec_freshly-generated-secret' },
    });
  });

  it('returns 404 for an unknown webhook and never rotates', async () => {
    prismaMock.webhookSubscription.findUnique.mockResolvedValue(null);

    const res = await rotateRequest();
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(prismaMock.webhookSubscription.update).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    rateLimitMock.mockResolvedValue({
      limited: true,
      headers: {},
      response: new Response('Too Many Requests', { status: 429 }),
    });

    const res = await rotateRequest();
    expect(res.status).toBe(429);
    expect(prismaMock.webhookSubscription.update).not.toHaveBeenCalled();
  });
});
