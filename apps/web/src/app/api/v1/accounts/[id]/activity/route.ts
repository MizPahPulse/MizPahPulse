import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { errorResponse, successResponse, ErrorCode } from '@/lib/api-errors';
import { parsePagination, buildPaginationArgs, paginatedResponse } from '@/lib/pagination';
import { rateLimit } from '@/lib/rate-limit';
import { isValidPublicKey } from '@mizpah-pulse/stellar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/accounts/[id]/activity
 *
 * Fetch activity summary and recent events for a Stellar account.
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 30,
    windowMs: 60_000,
    keyPrefix: 'account-activity',
  });
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await props.params;
    if (!isValidPublicKey(id)) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid Stellar public key');
    }

    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);

    const where = { accountId: id };
    const args = buildPaginationArgs(where, pagination);

    const [events, total, paymentCount, contractCount] = await Promise.all([
      prisma.event.findMany(args),
      prisma.event.count({ where }),
      prisma.event.count({ where: { ...where, category: 'PAYMENT' } }),
      prisma.event.count({ where: { ...where, category: 'CONTRACT' } }),
    ]);

    const result = paginatedResponse(
      events as Array<{ id: string } & (typeof events)[0]>,
      total,
      pagination,
    );

    return successResponse({
      accountId: id,
      summary: {
        totalTransactions: total,
        payments: paymentCount,
        contractInteractions: contractCount,
      },
      ...result,
      events: result.data.map((e) => ({
        ...e,
        ledgerSequence: (e as unknown as { ledgerSequence: bigint }).ledgerSequence.toString(),
        payload:
          typeof (e as unknown as { payload: unknown }).payload === 'string'
            ? JSON.parse((e as unknown as { payload: string }).payload)
            : (e as unknown as { payload: unknown }).payload,
      })),
    });
  } catch (error) {
    console.error('[API] Account activity error:', error);
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to fetch account activity');
  }
}
