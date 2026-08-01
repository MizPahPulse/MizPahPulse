import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { isValidPublicKey, isValidContractId, isValidTransactionHash } from '@mizpah-pulse/stellar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/search
 *
 * Universal search across wallets, contracts, transactions, and assets.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.length < 2) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_QUERY', message: 'Search query must be at least 2 characters' } },
      { status: 400 },
    );
  }

  try {
    const results: Record<string, unknown[]> = {};

    // Search transactions
    if (isValidTransactionHash(q)) {
      const tx = await prisma.event.findFirst({
        where: { transactionHash: q },
      });
      if (tx) {
        results.transactions = [{ hash: q, found: true, eventType: tx.eventType, timestamp: tx.timestamp }];
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
      results.accounts = [{
        publicKey: q,
        eventCount: txCount,
        recentEvents: accountEvents.map((e) => ({
          ...e,
          ledgerSequence: e.ledgerSequence.toString(),
        })),
      }];
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
      results.events = textMatches.map((e) => ({
        ...e,
        ledgerSequence: e.ledgerSequence.toString(),
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        query: q,
        results,
        totalResults: Object.values(results).reduce((s, arr) => s + arr.length, 0),
      },
      meta: { timestamp: new Date().toISOString(), version: 'v1' },
    });
  } catch (error) {
    console.error('[API] Search error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Search failed' } },
      { status: 500 },
    );
  }
}
