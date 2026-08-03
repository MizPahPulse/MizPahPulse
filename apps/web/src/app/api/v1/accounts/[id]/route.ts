import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { fetchAccount, fetchAccountTransactions } from '@mizpah-pulse/stellar';
import { isValidPublicKey } from '@mizpah-pulse/stellar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/accounts/[id]
 *
 * Fetch account details and recent activity from both the database and Stellar network.
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  if (!isValidPublicKey(id)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ADDRESS', message: 'Invalid Stellar public key' } },
      { status: 400 },
    );
  }

  try {
    // Fetch on-chain account data
    const stellarAccount = await fetchAccount(id).catch(() => null);

    // Fetch recent events from database
    const recentEvents = await prisma.event.findMany({
      where: { accountId: id },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    // Aggregate stats
    const totalEvents = await prisma.event.count({ where: { accountId: id } });
    const paymentsReceived = await prisma.event.count({
      where: { accountId: id, category: 'PAYMENT' },
    });
    const contractInteractions = await prisma.event.count({
      where: { accountId: id, category: 'CONTRACT' },
    });

    const data = {
      accountId: id,
      stellar: stellarAccount
        ? {
            sequence: stellarAccount.sequence,
            balances: stellarAccount.balances.map((b) => ({
              assetCode: (b as unknown as Record<string, unknown>).asset_code || 'XLM',
              assetIssuer: (b as unknown as Record<string, unknown>).asset_issuer || undefined,
              balance: b.balance,
            })),
            signers: stellarAccount.signers.map((s) => ({
              key: s.key,
              weight: s.weight,
            })),
            thresholds: {
              low: stellarAccount.thresholds.low_threshold,
              medium: stellarAccount.thresholds.med_threshold,
              high: stellarAccount.thresholds.high_threshold,
            },
          }
        : null,
      stats: {
        totalEvents,
        paymentsReceived,
        contractInteractions,
      },
      recentEvents: recentEvents.map((e: { id: string; ledgerSequence: number | bigint; [key: string]: unknown }) => ({
        ...e,
        ledgerSequence: e.ledgerSequence.toString(),
      })),
    };

    return NextResponse.json({
      success: true,
      data,
      meta: { timestamp: new Date().toISOString(), version: 'v1' },
    });
  } catch (error) {
    console.error('[API] Account error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch account details' } },
      { status: 500 },
    );
  }
}
