import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { errorResponse, successResponse, ErrorCode } from '@/lib/api-errors';
import { parsePagination, buildPaginationArgs, paginatedResponse } from '@/lib/pagination';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/contracts/[id]/events
 *
 * Fetch events for a specific contract with pagination and filtering.
 */
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 60,
    windowMs: 60_000,
    keyPrefix: 'contract-events',
  });
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await props.params;
    if (!id || id.length < 10) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid contract ID');
    }

    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);

    const where: Record<string, unknown> = { contractId: id };
    const eventTypes = searchParams.getAll('eventType');
    if (eventTypes.length > 0) {
      where.eventType = { in: eventTypes };
    }

    const args = buildPaginationArgs(where, pagination);
    const [events, total] = await Promise.all([
      prisma.event.findMany(args),
      prisma.event.count({ where }),
    ]);

    const result = paginatedResponse(events as Array<{ id: string } & typeof events[0]>, total, pagination);

    return successResponse({
      contractId: id,
      ...result,
      events: result.data.map((e) => ({
        ...e,
        ledgerSequence: (e as unknown as { ledgerSequence: bigint }).ledgerSequence.toString(),
        payload: typeof (e as unknown as { payload: unknown }).payload === 'string'
          ? JSON.parse((e as unknown as { payload: string }).payload)
          : (e as unknown as { payload: unknown }).payload,
      })),
    });
  } catch (error) {
    console.error('[API] Contract events error:', error);
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to fetch contract events');
  }
}
