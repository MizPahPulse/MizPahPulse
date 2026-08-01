import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { isValidContractId } from '@mizpah-pulse/stellar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/contracts/[id]
 *
 * Fetch Soroban smart contract details and recent invocations.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!isValidContractId(id)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_CONTRACT', message: 'Invalid Stellar contract ID' } },
      { status: 400 },
    );
  }

  try {
    const recentEvents = await prisma.event.findMany({
      where: { contractId: id },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    const totalInvocations = await prisma.event.count({
      where: { contractId: id },
    });

    const failedInvocations = await prisma.event.count({
      where: { contractId: id, severity: 'ERROR' },
    });

    const data = {
      contractId: id,
      stats: {
        totalInvocations,
        failedInvocations,
        successRate: totalInvocations > 0
          ? ((totalInvocations - failedInvocations) / totalInvocations * 100).toFixed(1) + '%'
          : 'N/A',
      },
      recentEvents: recentEvents.map((e) => ({
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
    console.error('[API] Contract error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch contract details' } },
      { status: 500 },
    );
  }
}
