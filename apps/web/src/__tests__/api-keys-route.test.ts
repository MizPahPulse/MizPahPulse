/**
 * Tests for GET/POST /api/v1/api-keys and DELETE /api/v1/api-keys/[id] (#18).
 *
 * Covers masked listing (no raw keys ever), creation returning the secret
 * exactly once with selectable permissions, revoke semantics (soft delete,
 * 404 for unknown ids, 409 for already-revoked), and validation/rate limits.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  apiKey: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock('@mizpah-pulse/database', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
}));

import { GET, POST } from '@/app/api/v1/api-keys/route';
import { DELETE } from '@/app/api/v1/api-keys/[id]/route';

function apiKey(overrides: Record<string, unknown> = {}) {
  return {
    id: 'key-1',
    userId: 'default',
    key: 'mp_live_abcdefghijklmnopqrstuvwxyz123456',
    name: 'Production App',
    permissions: '["read","write"]',
    isActive: true,
    lastUsedAt: new Date('2026-09-04T10:00:00.000Z'),
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    ...overrides,
  };
}

function listRequest(userId?: string) {
  const query = userId ? `?userId=${userId}` : '';
  return GET(new Request(`http://localhost:3000/api/v1/api-keys${query}`), undefined);
}

function createRequest(body: unknown) {
  return POST(
    new Request('http://localhost:3000/api/v1/api-keys', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    undefined,
  );
}

function revokeRequest(id = 'key-1') {
  return DELETE(new Request(`http://localhost:3000/api/v1/api-keys/${id}`, { method: 'DELETE' }), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMock.mockResolvedValue({ limited: false, headers: {}, response: null });
});

describe('GET /api/v1/api-keys', () => {
  it('lists active keys with masked key material only', async () => {
    prismaMock.apiKey.findMany.mockResolvedValue([apiKey()]);

    const res = await listRequest();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toEqual(
      expect.objectContaining({
        id: 'key-1',
        name: 'Production App',
        network: 'live',
        permissions: ['read', 'write'],
        maskedKey: 'mp_live_••••••••••••',
      }),
    );
    // Raw key material must never appear in list responses.
    expect(JSON.stringify(body)).not.toContain('abcdefghijklmnopqrstuvwxyz');
    expect(prismaMock.apiKey.findMany).toHaveBeenCalledWith({
      where: { userId: 'default', isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });

  it('uses the provided userId filter', async () => {
    prismaMock.apiKey.findMany.mockResolvedValue([]);

    await listRequest('user-42');
    expect(prismaMock.apiKey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-42', isActive: true } }),
    );
  });

  it('returns 429 when rate limited', async () => {
    rateLimitMock.mockResolvedValue({
      limited: true,
      headers: {},
      response: new Response('Too Many Requests', { status: 429 }),
    });

    const res = await listRequest();
    expect(res.status).toBe(429);
  });
});

describe('POST /api/v1/api-keys', () => {
  it('creates a key and returns the raw secret exactly once', async () => {
    prismaMock.apiKey.create.mockResolvedValue(apiKey({ key: 'mp_live_generated-secret-value' }));

    const res = await createRequest({ name: 'Production App', permissions: ['read', 'write'] });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.key).toBe('mp_live_generated-secret-value');
    expect(body.data.permissions).toEqual(['read', 'write']);
    expect(body.data.maskedKey).toBe('mp_live_••••••••••••');

    expect(prismaMock.apiKey.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'default',
        name: 'Production App',
        permissions: '["read","write"]',
      }),
    });
    // Generated keys must carry the mp_live_/mp_test_ prefix.
    const data = prismaMock.apiKey.create.mock.calls[0][0].data as { key: string };
    expect(data.key).toMatch(/^mp_live_[A-Za-z0-9_-]+$/);
  });

  it('creates a test key with default read permission when omitted', async () => {
    prismaMock.apiKey.create.mockResolvedValue(apiKey({ key: 'mp_test_generated-secret-value' }));

    const res = await createRequest({ name: 'Dev Testing', network: 'test' });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.network).toBe('test');
    const data = prismaMock.apiKey.create.mock.calls[0][0].data as {
      key: string;
      permissions: string;
    };
    expect(data.key.startsWith('mp_test_')).toBe(true);
    expect(data.permissions).toBe('["read"]');
  });

  it('rejects a missing name and invalid permissions with a 400', async () => {
    const missingName = await createRequest({ permissions: ['read'] });
    expect(missingName.status).toBe(400);

    const badPerm = await createRequest({ name: 'x', permissions: ['admin'] });
    expect(badPerm.status).toBe(400);
    expect(prismaMock.apiKey.create).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    rateLimitMock.mockResolvedValue({
      limited: true,
      headers: {},
      response: new Response('Too Many Requests', { status: 429 }),
    });

    const res = await createRequest({ name: 'x' });
    expect(res.status).toBe(429);
  });
});

describe('DELETE /api/v1/api-keys/[id]', () => {
  it('revokes an active key (soft delete)', async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue(apiKey());
    prismaMock.apiKey.update.mockResolvedValue(apiKey({ isActive: false }));

    const res = await revokeRequest();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.revoked).toBe(true);
    expect(prismaMock.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'key-1' },
      data: { isActive: false },
    });
  });

  it('returns 404 for an unknown key', async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue(null);

    const res = await revokeRequest();
    expect(res.status).toBe(404);
    expect(prismaMock.apiKey.update).not.toHaveBeenCalled();
  });

  it('returns 409 when the key is already revoked', async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue(apiKey({ isActive: false }));

    const res = await revokeRequest();
    expect(res.status).toBe(409);
    expect(prismaMock.apiKey.update).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    rateLimitMock.mockResolvedValue({
      limited: true,
      headers: {},
      response: new Response('Too Many Requests', { status: 429 }),
    });

    const res = await revokeRequest();
    expect(res.status).toBe(429);
  });
});
