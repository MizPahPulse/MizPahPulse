import { prisma } from '@mizpah-pulse/database';
import { StrKey } from '@stellar/stellar-sdk';
import { z } from 'zod';
import { errorResponse, successResponse, ErrorCode, createRequestId } from '@/lib/api-errors';
import { requireApiKey } from '@/lib/api-key';
import { prismaErrorResponse } from '@/lib/prisma-errors';
import { rateLimit } from '@/lib/rate-limit';
import { withRequestId } from '@/lib/request-id';
import { withCompression } from '@/lib/compress';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NETWORKS = ['TESTNET', 'PUBLIC', 'FUTURENET', 'SANDBOX'] as const;

const ListWalletsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  userId: z.string().optional().default('default'),
});

const RegisterWalletSchema = z.object({
  publicKey: z.string().min(1).max(70),
  label: z.string().trim().max(80).optional(),
  network: z.enum(NETWORKS).default('TESTNET'),
  notificationEnabled: z.boolean().default(true),
  userId: z.string().optional().default('default'),
});

interface WalletRow {
  id: string;
  userId: string;
  publicKey: string;
  label: string | null;
  network: string;
  isActive: boolean;
  notificationEnabled: boolean;
  tags: unknown;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

/** Normalize Prisma JSON columns into their public JSON shapes. */
function sanitizeWallet(w: WalletRow) {
  let tags: unknown = [];
  try {
    tags = typeof w.tags === 'string' ? JSON.parse(w.tags) : (w.tags ?? []);
  } catch {
    tags = [];
  }
  return {
    ...w,
    tags,
    lastSyncedAt: w.lastSyncedAt ? w.lastSyncedAt.toISOString() : null,
  };
}

/**
 * GET /api/v1/wallets
 *
 * List the wallets the current user monitors, newest first, with pagination.
 * `lastSyncedAt` is populated by the ingester whenever it observes on-chain
 * activity for a monitored wallet (issue #49).
 */
async function GETHandler(request: Request) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 60,
    windowMs: 60_000,
    keyPrefix: 'wallets:list',
  });
  if (rateLimitResult.limited) return rateLimitResult.response!;

  const requestId = request.headers.get('X-Request-ID') ?? createRequestId();
  const { searchParams } = new URL(request.url);

  const queryResult = ListWalletsQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    userId: searchParams.get('userId') ?? undefined,
  });

  if (!queryResult.success) {
    return errorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid query parameters',
      queryResult.error.flatten() as unknown as Record<string, unknown>,
    );
  }

  const { page, limit, userId } = queryResult.data;
  const skip = (page - 1) * limit;

  try {
    const [wallets, total] = await Promise.all([
      prisma.monitoredWallet.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.monitoredWallet.count({ where: { userId } }),
    ]);

    return successResponse(
      {
        data: wallets.map((w: WalletRow) => sanitizeWallet(w)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      undefined,
      undefined,
      { 'X-Request-ID': requestId, ...rateLimitResult.headers },
    );
  } catch (error) {
    return prismaErrorResponse(error, 'Failed to retrieve monitored wallets', requestId);
  }
}

/**
 * POST /api/v1/wallets
 *
 * Register a Stellar public key to be monitored. Mirrors the write-endpoint
 * conventions of the other v1 routes: rate limited, API-key validated when a
 * key is presented, and zod-validated.
 */
async function POSTHandler(request: Request) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 10,
    windowMs: 60_000,
    keyPrefix: 'wallets:create',
  });
  if (rateLimitResult.limited) return rateLimitResult.response!;

  const auth = await requireApiKey(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const parsed = RegisterWalletSchema.parse(body);

    if (!StrKey.isValidEd25519PublicKey(parsed.publicKey)) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid Stellar public key', {
        publicKey: 'Must be a valid ed25519 Stellar account address (G…)',
      });
    }

    const wallet = await prisma.monitoredWallet.create({
      data: {
        userId: parsed.userId,
        publicKey: parsed.publicKey,
        label: parsed.label || null,
        network: parsed.network,
        notificationEnabled: parsed.notificationEnabled,
        tags: JSON.stringify([]),
      },
    });

    return successResponse(
      sanitizeWallet(wallet as unknown as WalletRow),
      201,
      undefined,
      rateLimitResult.headers,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid wallet configuration',
        error.flatten() as unknown as Record<string, unknown>,
      );
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return errorResponse(ErrorCode.CONFLICT, 'This wallet is already being monitored');
    }
    return prismaErrorResponse(error, 'Failed to register wallet');
  }
}

export const GET = withCompression(withRequestId(GETHandler));
export const POST = withRequestId(POSTHandler);
