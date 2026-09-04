import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@mizpah-pulse/database';
import { errorResponse, ErrorCode } from './api-errors';
import type { NextResponse } from 'next/server';

/**
 * API key authentication for REST endpoints (issue #28).
 *
 * Keys are stored in the ApiKey table and presented as
 * `Authorization: Bearer mp_live_...`. Validation covers format, existence,
 * active flag, and expiry. `lastUsedAt` is refreshed on each successful call
 * so operators can see key usage.
 *
 * When `API_KEY_SECRET` is set, generated keys also carry an HMAC-SHA256
 * fingerprint (see `api-keys/route.ts`) that is re-derived and compared here
 * so a leaked database row cannot be replayed against the API.
 */

/** Fingerprint an API key with the server secret (constant-time compare). */
export function fingerprintApiKey(key: string): string | null {
  const secret = process.env.API_KEY_SECRET;
  if (!secret) return null;
  return createHmac('sha256', secret).update(key).digest('hex');
}

function fingerprintsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/** Normalize the permissions JSON column to a string array. */
function normalizePermissions(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch {
      // fall through to the safe default below
    }
  }
  return ['read'];
}

export interface AuthenticatedApiKey {
  userId: string;
  permissions: string[];
}

export interface AuthResult {
  ok: boolean;
  response?: NextResponse;
  apiKey?: AuthenticatedApiKey;
}

/**
 * Validate an API key if one is presented. Returns `ok: false` with no
 * response when no Authorization header is present — callers decide whether
 * the endpoint requires a key or allows anonymous access.
 */
export async function authenticateApiKey(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { ok: false };
  }

  const [scheme, token, ...rest] = authHeader.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
    return {
      ok: false,
      response: errorResponse(
        ErrorCode.UNAUTHORIZED,
        'Invalid authorization header. Expected: Authorization: Bearer mp_live_...',
      ),
    };
  }

  if (!token.startsWith('mp_live_') && !token.startsWith('mp_test_')) {
    return {
      ok: false,
      response: errorResponse(ErrorCode.UNAUTHORIZED, 'Invalid API key format'),
    };
  }

  const apiKey = await prisma.apiKey.findUnique({ where: { key: token } });
  if (!apiKey || !apiKey.isActive) {
    return {
      ok: false,
      response: errorResponse(ErrorCode.UNAUTHORIZED, 'Invalid or inactive API key'),
    };
  }

  // When the key was minted with a fingerprint (API_KEY_SECRET set), the
  // presented token must still match it — a copied database row is rejected.
  const expectedFingerprint = fingerprintApiKey(token);
  if (expectedFingerprint && !fingerprintsMatch(apiKey.keyFingerprint, expectedFingerprint)) {
    return {
      ok: false,
      response: errorResponse(ErrorCode.UNAUTHORIZED, 'Invalid API key'),
    };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return {
      ok: false,
      response: errorResponse(ErrorCode.UNAUTHORIZED, 'API key has expired'),
    };
  }

  // Best-effort usage tracking (never fail the request on a write error).
  await prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return {
    ok: true,
    apiKey: {
      userId: apiKey.userId,
      permissions: normalizePermissions(apiKey.permissions),
    },
  };
}

/**
 * Require a valid API key. When `REQUIRE_API_KEY=true` every request must
 * authenticate; otherwise keys are validated when presented but anonymous
 * access is still allowed (safe default for the public demo).
 */
export async function requireApiKey(request: Request): Promise<{
  response?: NextResponse;
  apiKey?: AuthenticatedApiKey;
}> {
  const result = await authenticateApiKey(request);

  if (result.response) return { response: result.response };
  if (result.ok) return { apiKey: result.apiKey };

  if (process.env.REQUIRE_API_KEY === 'true') {
    return {
      response: errorResponse(
        ErrorCode.UNAUTHORIZED,
        'API key required. Pass Authorization: Bearer mp_live_...',
      ),
    };
  }

  return {};
}
