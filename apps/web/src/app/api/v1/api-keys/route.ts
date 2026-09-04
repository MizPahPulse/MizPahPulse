import { randomBytes } from 'crypto';
import { prisma } from '@mizpah-pulse/database';
import { z } from 'zod';
import { errorResponse, successResponse, ErrorCode, createRequestId } from '@/lib/api-errors';
import { fingerprintApiKey } from '@/lib/api-key';
import { prismaErrorResponse } from '@/lib/prisma-errors';
import { rateLimit } from '@/lib/rate-limit';
import { withRequestId } from '@/lib/request-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API key management (issue #18). Keys authenticate REST calls as
 * `Authorization: Bearer mp_live_...` (see `lib/api-key.ts`); these routes let
 * developers list, create, and revoke them.
 *
 * The raw key material is only ever returned once — from POST. List responses
 * carry a `maskedKey` placeholder so a key can never leak through the API a
 * second time.
 */

const CreateApiKeySchema = z.object({
  name: z.string().trim().min(1, 'A name is required').max(100),
  permissions: z
    .array(z.enum(['read', 'write']))
    .min(1, 'At least one permission is required')
    .default(['read']),
  network: z.enum(['live', 'test']).default('live'),
  userId: z.string().trim().min(1).max(100).optional(),
});

type ParsedCreate = z.infer<typeof CreateApiKeySchema>;

/** Mask the key prefix + bullets for list views (matches `whsec_` masking). */
function maskedKeyFor(key: string): string {
  const prefix = key.startsWith('mp_test_') ? 'mp_test_' : 'mp_live_';
  return `${prefix}${'•'.repeat(12)}`;
}

/** Parse the permissions JSON column (already an array when read from Prisma). */
function parsePermissions(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch {
      // fall through to the default below
    }
  }
  return ['read'];
}

/** Shape a stored row for list output — never includes the raw key. */
function toApiKeyView(row: {
  id: string;
  userId: string;
  key: string;
  name: string;
  permissions: unknown;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    network: row.key.startsWith('mp_test_') ? 'test' : 'live',
    permissions: parsePermissions(row.permissions),
    isActive: row.isActive,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    maskedKey: maskedKeyFor(row.key),
  };
}

/**
 * GET /api/v1/api-keys?userId=default
 *
 * List active API keys for a user, newest first. Raw key material is never
 * returned — each row carries a masked placeholder instead.
 */
async function GETHandler(request: Request) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 60,
    windowMs: 60_000,
    keyPrefix: 'api-keys:list',
  });
  if (rateLimitResult.limited) return rateLimitResult.response!;

  const requestId = request.headers.get('X-Request-ID') ?? createRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') ?? 'default';

    const keys = await prisma.apiKey.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return successResponse(keys.map(toApiKeyView), 200, undefined, {
      'X-Request-ID': requestId,
      ...rateLimitResult.headers,
    });
  } catch (error) {
    return prismaErrorResponse(error, 'Failed to retrieve API keys', requestId);
  }
}

/**
 * POST /api/v1/api-keys
 *
 * Create an API key with selectable read/write permissions. The generated
 * `mp_live_`/`mp_test_` secret is returned exactly once in this response —
 * later reads only ever expose the masked form.
 */
async function POSTHandler(request: Request) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 10,
    windowMs: 60_000,
    keyPrefix: 'api-keys:create',
  });
  if (rateLimitResult.limited) return rateLimitResult.response!;

  const requestId = request.headers.get('X-Request-ID') ?? createRequestId();

  try {
    const body: unknown = await request.json().catch(() => {
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['body'],
          message: 'Request body must be valid JSON',
        },
      ]);
    });

    const parsed: ParsedCreate = CreateApiKeySchema.parse(body);
    const userId = parsed.userId || 'default';
    const network = parsed.network;
    const generatedKey = `${network === 'test' ? 'mp_test_' : 'mp_live_'}${randomBytes(24).toString('base64url')}`;
    const permissions = parsed.permissions;

    // Issue #28: when API_KEY_SECRET is set, store an HMAC fingerprint of
    // the secret so authentication can reject copied database rows.
    const created = await prisma.apiKey.create({
      data: {
        userId,
        key: generatedKey,
        name: parsed.name,
        permissions: JSON.stringify(permissions),
        keyFingerprint: fingerprintApiKey(generatedKey),
      },
    });

    return successResponse(
      {
        ...toApiKeyView(created),
        key: created.key, // Shown exactly once, at creation time.
        permissions: parsePermissions(created.permissions),
      },
      201,
      undefined,
      { 'X-Request-ID': requestId, ...rateLimitResult.headers },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid API key configuration',
        error.flatten() as unknown as Record<string, unknown>,
        requestId,
      );
    }
    return prismaErrorResponse(error, 'Failed to create API key', requestId);
  }
}

export const GET = withRequestId(GETHandler);
export const POST = withRequestId(POSTHandler);
