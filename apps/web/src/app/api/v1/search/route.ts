import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { isValidPublicKey, isValidContractId, isValidTransactionHash } from '@mizpah-pulse/stellar';
import { errorResponse, successResponse, ErrorCode } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { recordRequest } from '@/lib/monitoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/search
 *
 * Universal search across wallets, contracts, transactions, and assets.
 */
export async function GET(request: Request) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 30,
    windowMs: 60_000,
    keyPrefix: 'search',
  });
  if (rateLimitResult) return rateLimitResult;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.length < 2) {
    return errorResponse(ErrorCode.VALIDATION_ERROR, 'Search query must be at least 2 characters');
  }

  try {
    const results: Record<string, unknown[]> = {};

    // Search transactions
    if (isValidTransactionHash(q)) {
      const tx = await prisma.event.findFirst({
        where: { transactionHash: q },
      });
      if (tx) {
        results.transactions = [
          { hash: q, found: true, eventType: tx.eventType, timestamp: tx.timestamp },
        ];
      }
    }

    // Search accounts
    if (isValidPublicKey(q)) {
      const accountEvents = await prisma.event.findMany({
        where: { accountId: q },
        orderBy: { timestamp: 'desc' },
        take: 5,
      });
      const txCount = await prisma.event.count({ where: { accountId: q } });
      results.accounts = [
        {
          publicKey: q,
          eventCount: txCount,
          recentEvents: accountEvents.map(
            (e: { id: string; ledgerSequence: number | bigint; [key: string]: unknown }) => ({
              ...e,
              ledgerSequence: e.ledgerSequence.toString(),
            }),
          ),
        },
      ];
    }

    // Search contracts
    if (isValidContractId(q)) {
      const [events, eventCount] = await Promise.all([
        prisma.event.findMany({
          where: { contractId: q },
          orderBy: { timestamp: 'desc' },
          take: 5,
        }),
        prisma.event.count({ where: { contractId: q } }),
      ]);
      results.contracts = [{ contractId: q, eventCount, recentEvents: events.length }];
    }

    // Full-text search on event types and accounts
    const textMatches = await prisma.event.findMany({
      where: {
        OR: [
          { eventType: { contains: q, mode: 'insensitive' } },
          { accountId: { contains: q, mode: 'insensitive' } },
          { assetCode: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { timestamp: 'desc' },
    });

    if (textMatches.length > 0) {
      results.events = textMatches.map(
        (e: { id: string; ledgerSequence: number | bigint; [key: string]: unknown }) => ({
          ...e,
          ledgerSequence: e.ledgerSequence.toString(),
        }),
      );
    }

    return successResponse({
      query: q,
      results,
      totalResults: Object.values(results).reduce((s, arr) => s + arr.length, 0),
    });
  } catch (error) {
    logger.error('[API] Search error:', error);
    recordRequest(0, true);
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Search failed');
  }
}
