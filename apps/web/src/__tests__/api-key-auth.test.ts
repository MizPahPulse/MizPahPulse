/**
 * Tests for the API-key authentication helper (issue #28).
 *
 * `authenticateApiKey` / `requireApiKey` validate the
 * `Authorization: Bearer mp_live_...` header against the ApiKey table:
 * format, existence, active flag, expiry, and (when API_KEY_SECRET is set)
 * the HMAC fingerprint minted at key-creation time. `lastUsedAt` must be
 * refreshed on every successful call, and `REQUIRE_API_KEY=true` turns
 * anonymous access off with a 401.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';

const prismaMock = vi.hoisted(() => ({
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock('@mizpah-pulse/database', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

import { authenticateApiKey, requireApiKey, fingerprintApiKey } from '@/lib/api-key';

const VALID_KEY = 'mp_live_abcdefghijklmnopqrstuvwxyz123456';

function apiKeyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'key-1',
    userId: 'user-1',
    key: VALID_KEY,
    name: 'Prod App',
    permissions: '["read","write"]',
    isActive: true,
    lastUsedAt: null,
    expiresAt: null,
    keyFingerprint: null,
    ...overrides,
  };
}

function authedRequest(key?: string) {
  const headers: Record<string, string> = {};
  if (key !== undefined) headers.authorization = `Bearer ${key}`;
  return new Request('http://localhost:3000/api/v1/webhooks', {
    method: 'POST',
    headers,
    body: JSON.stringify({ endpoint: 'https://example.com/hook', events: ['PAYMENT'] }),
  });
}

describe('fingerprintApiKey', () => {
  afterEach(() => {
    delete process.env.API_KEY_SECRET;
  });

  it('returns null when API_KEY_SECRET is not configured', () => {
    delete process.env.API_KEY_SECRET;
    expect(fingerprintApiKey(VALID_KEY)).toBeNull();
  });

  it('derives a stable HMAC-SHA256 fingerprint when the secret is set', () => {
    process.env.API_KEY_SECRET = 'test-secret';
    const expected = createHmac('sha256', 'test-secret').update(VALID_KEY).digest('hex');
    expect(fingerprintApiKey(VALID_KEY)).toBe(expected);
  });
});

describe('authenticateApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.API_KEY_SECRET;
  });

  it('allows anonymous requests (no header) without touching the DB', async () => {
    const result = await authenticateApiKey(authedRequest(undefined));
    expect(result.ok).toBe(false);
    expect(result.response).toBeUndefined();
    expect(prismaMock.apiKey.findUnique).not.toHaveBeenCalled();
  });

  it('rejects non-Bearer schemes with 401 UNAUTHORIZED', async () => {
    const req = new Request('http://localhost:3000/api/v1/webhooks', {
      headers: { authorization: `Basic ${Buffer.from('a:b').toString('base64')}` },
    });
    const basic = await authenticateApiKey(req);
    expect(basic.ok).toBe(false);
    expect(basic.response).toBeDefined();
    expect(basic.response!.status).toBe(401);
    const body = await basic.response!.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects malformed header shapes with 401', async () => {
    const req = new Request('http://localhost:3000/api/v1/webhooks', {
      headers: { authorization: 'Bearer a b c' },
    });
    const result = await authenticateApiKey(req);
    expect(result.ok).toBe(false);
    expect(result.response!.status).toBe(401);
  });

  it('rejects keys without the mp_live_/mp_test_ prefix', async () => {
    const req = new Request('http://localhost:3000/api/v1/webhooks', {
      headers: { authorization: 'Bearer not-a-real-prefix-123456' },
    });
    const result = await authenticateApiKey(req);
    expect(result.ok).toBe(false);
    expect(result.response!.status).toBe(401);
    expect(prismaMock.apiKey.findUnique).not.toHaveBeenCalled();
  });

  it('rejects unknown or inactive keys with 401', async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue(null);
    const result = await authenticateApiKey(authedRequest(VALID_KEY));
    expect(result.ok).toBe(false);
    expect(result.response!.status).toBe(401);

    prismaMock.apiKey.findUnique.mockResolvedValue(apiKeyRow({ isActive: false }));
    const inactive = await authenticateApiKey(authedRequest(VALID_KEY));
    expect(inactive.ok).toBe(false);
    expect(inactive.response!.status).toBe(401);
  });

  it('rejects expired keys with 401', async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue(
      apiKeyRow({ expiresAt: new Date(Date.now() - 60_000) }),
    );
    const result = await authenticateApiKey(authedRequest(VALID_KEY));
    expect(result.ok).toBe(false);
    expect(result.response!.status).toBe(401);
    expect(prismaMock.apiKey.update).not.toHaveBeenCalled();
  });

  it('accepts a valid key and refreshes lastUsedAt', async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue(apiKeyRow());
    prismaMock.apiKey.update.mockResolvedValue(apiKeyRow());

    const result = await authenticateApiKey(authedRequest(VALID_KEY));
    expect(result.ok).toBe(true);
    expect(result.apiKey).toEqual({ userId: 'user-1', permissions: ['read', 'write'] });
    expect(prismaMock.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'key-1' },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it('rejects a key whose fingerprint does not match (copied DB row)', async () => {
    process.env.API_KEY_SECRET = 'server-secret';
    prismaMock.apiKey.findUnique.mockResolvedValue(
      apiKeyRow({
        keyFingerprint: createHmac('sha256', 'other-secret').update(VALID_KEY).digest('hex'),
      }),
    );
    const result = await authenticateApiKey(authedRequest(VALID_KEY));
    expect(result.ok).toBe(false);
    expect(result.response!.status).toBe(401);
  });

  it('accepts a key with a matching fingerprint', async () => {
    process.env.API_KEY_SECRET = 'server-secret';
    prismaMock.apiKey.findUnique.mockResolvedValue(
      apiKeyRow({ keyFingerprint: fingerprintApiKey(VALID_KEY) }),
    );
    prismaMock.apiKey.update.mockResolvedValue(apiKeyRow());

    const result = await authenticateApiKey(authedRequest(VALID_KEY));
    expect(result.ok).toBe(true);
  });
});

describe('requireApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.REQUIRE_API_KEY;
    delete process.env.API_KEY_SECRET;
  });

  it('allows anonymous access by default (public demo)', async () => {
    const result = await requireApiKey(authedRequest(undefined));
    expect(result.response).toBeUndefined();
    expect(result.apiKey).toBeUndefined();
  });

  it('rejects anonymous access when REQUIRE_API_KEY=true', async () => {
    process.env.REQUIRE_API_KEY = 'true';
    const result = await requireApiKey(authedRequest(undefined));
    expect(result.response).toBeDefined();
    expect(result.response!.status).toBe(401);
    const body = await result.response!.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('propagates invalid-key responses', async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue(null);
    const result = await requireApiKey(authedRequest(VALID_KEY));
    expect(result.response).toBeDefined();
    expect(result.response!.status).toBe(401);
  });

  it('passes through the authenticated key', async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue(apiKeyRow());
    prismaMock.apiKey.update.mockResolvedValue(apiKeyRow());
    const result = await requireApiKey(authedRequest(VALID_KEY));
    expect(result.response).toBeUndefined();
    expect(result.apiKey).toEqual({ userId: 'user-1', permissions: ['read', 'write'] });
  });
});
