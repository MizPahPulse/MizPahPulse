import { prisma } from '@mizpah-pulse/database';
import { errorResponse, ErrorCode } from './api-errors';
import type { NextResponse } from 'next/server';

/**
 * API key authentication for REST endpoints.
 *
 * Keys are stored in the ApiKey table and presented as
 * `Authorization: Bearer mp_live_...`. Validation covers format, existence,
 * active flag, and expiry. `lastUsedAt` is refreshed on each successful call
 * so operators can see key usage.
 */

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
      permissions: (Array.isArray(apiKey.permissions) ? apiKey.permissions : ['read']) as string[],
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
