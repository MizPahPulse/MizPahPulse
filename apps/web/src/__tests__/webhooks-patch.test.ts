/**
 * API route tests for PATCH /api/v1/webhooks/[id] (issue #27) plus the shared
 * webhook sanitization helpers and Prisma error mapping applied there (#43).
 *
 * Prisma, the rate limiter, and the SSRF check are mocked so every branch can
 * be exercised without a database or network.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

const prismaMock = vi.hoisted(() => ({
  webhookSubscription: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@mizpah-pulse/database', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(async () => ({ limited: false, headers: {}, response: null })),
}));

vi.mock('@/lib/ssrf', () => ({
  isPublicWebhookEndpoint: vi.fn(async () => ({ ok: true })),
}));

import { PATCH, DELETE } from '@/app/api/v1/webhooks/[id]/route';
import { maskSecret, sanitizeWebhook } from '@/lib/webhook-utils';

const EXISTING = {
  id: 'wh_1',
  userId: 'default',
  endpoint: 'https://example.com/hooks/old',
  secret: 'whsec_0123456789abcdef',
  events: '["PAYMENT"]',
  isActive: true,
  maxRetries: 3,
  retryDelayMs: 5000,
  lastDeliveryAt: null,
  failedDeliveries: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const UPDATED = {
  ...EXISTING,
  endpoint: 'https://example.com/hooks/new',
  events: '["PAYMENT","DEX_TRADE"]',
  isActive: false,
  maxRetries: 5,
  retryDelayMs: 1000,
};

function patchRequest(body: unknown) {
  return new Request('http://localhost:3000/api/v1/webhooks/wh_1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function callPatch(body: unknown) {
  return PATCH(patchRequest(body), { params: Promise.resolve({ id: 'wh_1' }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.webhookSubscription.findUnique.mockResolvedValue(EXISTING);
  prismaMock.webhookSubscription.update.mockResolvedValue(UPDATED);
});

describe('PATCH /api/v1/webhooks/[id]', () => {
  it('updates the provided fields and returns the sanitized webhook', async () => {
    const res = await callPatch({
      endpoint: 'https://example.com/hooks/new',
      events: ['PAYMENT', 'DEX_TRADE'],
      isActive: false,
      maxRetries: 5,
      retryDelayMs: 1000,
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prismaMock.webhookSubscription.update).toHaveBeenCalledWith({
      where: { id: 'wh_1' },
      data: {
        endpoint: 'https://example.com/hooks/new',
        events: '["PAYMENT","DEX_TRADE"]',
        isActive: false,
        maxRetries: 5,
        retryDelayMs: 1000,
      },
    });
    // Response exposes the parsed event list and a masked secret, never the raw secret.
    expect(body.data.endpoint).toBe('https://example.com/hooks/new');
    expect(body.data.events).toEqual(['PAYMENT', 'DEX_TRADE']);
    expect(body.data.secretMasked).toMatch(/^whsec_•{12}$/);
    expect(body.data.secret).toBeUndefined();
    expect(res.headers.get('X-Request-ID')).toBeTruthy();
  });

  it('returns 404 when the webhook does not exist', async () => {
    prismaMock.webhookSubscription.findUnique.mockResolvedValue(null);

    const res = await callPatch({ endpoint: 'https://example.com/hooks/new' });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(prismaMock.webhookSubscription.update).not.toHaveBeenCalled();
  });

  it('rejects an invalid endpoint URL with 400 VALIDATION_ERROR', async () => {
    const res = await callPatch({ endpoint: 'not-a-url' });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(prismaMock.webhookSubscription.update).not.toHaveBeenCalled();
  });

  it('rejects a secret shorter than 16 characters', async () => {
    const res = await callPatch({ secret: 'short' });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an empty events array', async () => {
    const res = await callPatch({ events: [] });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects out-of-range maxRetries', async () => {
    const res = await callPatch({ maxRetries: 99 });
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a non-JSON request body with 400', async () => {
    const res = await callPatch('this is not json');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('maps a unique-constraint failure on update to 409 CONFLICT', async () => {
    prismaMock.webhookSubscription.update.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['endpoint'] },
    });

    const res = await callPatch({ endpoint: 'https://example.com/hooks/new' });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('maps a missing-record failure on update to 404 NOT_FOUND', async () => {
    prismaMock.webhookSubscription.update.mockRejectedValue({
      code: 'P2025',
      message: 'Record not found',
    });

    const res = await callPatch({ endpoint: 'https://example.com/hooks/new' });
    expect((await res.json()).error.code).toBe('NOT_FOUND');
  });

  it('propagates a rate-limit response when throttled', async () => {
    const { rateLimit } = await import('@/lib/rate-limit');
    (rateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      limited: true,
      headers: {},
      response: NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED' } },
        { status: 429 },
      ),
    });

    const res = await callPatch({ endpoint: 'https://example.com/hooks/new' });
    expect(res.status).toBe(429);
    expect(prismaMock.webhookSubscription.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/v1/webhooks/[id]', () => {
  it('deletes an existing webhook', async () => {
    prismaMock.webhookSubscription.delete.mockResolvedValue(EXISTING);

    const res = await DELETE(new Request('http://localhost:3000/api/v1/webhooks/wh_1'), {
      params: Promise.resolve({ id: 'wh_1' }),
    });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data).toEqual({ deleted: true, id: 'wh_1' });
    expect(prismaMock.webhookSubscription.delete).toHaveBeenCalledWith({ where: { id: 'wh_1' } });
  });

  it('returns 404 when the webhook does not exist', async () => {
    prismaMock.webhookSubscription.findUnique.mockResolvedValue(null);

    const res = await DELETE(new Request('http://localhost:3000/api/v1/webhooks/wh_1'), {
      params: Promise.resolve({ id: 'wh_1' }),
    });
    expect((await res.json()).error.code).toBe('NOT_FOUND');
  });

  it('maps a Prisma failure during delete to a structured error', async () => {
    prismaMock.webhookSubscription.delete.mockRejectedValue({
      code: 'P2025',
      message: 'Record not found',
    });

    const res = await DELETE(new Request('http://localhost:3000/api/v1/webhooks/wh_1'), {
      params: Promise.resolve({ id: 'wh_1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Record not found');
  });
});

describe('webhook sanitization helpers', () => {
  it('masks secrets with and without the whsec_ prefix', () => {
    expect(maskSecret('whsec_abcdefghijklmnop')).toMatch(/^whsec_•{12}$/);
    expect(maskSecret('plainsecretvalue')).toMatch(/^•{12}$/);
    expect(maskSecret('plainsecretvalue')).not.toContain('plainsecretvalue');
  });

  it('sanitizes webhook records, dropping the raw secret', () => {
    const sanitized = sanitizeWebhook({ id: 'wh_1', secret: 'whsec_abcdef', events: '[]' });
    expect(sanitized.secret).toBeUndefined();
    expect(sanitized.secretMasked).toBe('whsec_••••••••••••');
    expect(sanitized.id).toBe('wh_1');
  });

  it('sanitizes records without a secret to null masking', () => {
    const sanitized = sanitizeWebhook({ id: 'wh_1', secret: null, events: '[]' });
    expect(sanitized.secretMasked).toBeNull();
  });
});
