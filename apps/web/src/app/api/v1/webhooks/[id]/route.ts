import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/v1/webhooks/[id]
 *
 * Delete a registered webhook subscription.
 */
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  try {
    await prisma.webhookSubscription.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { deleted: id },
      meta: { timestamp: new Date().toISOString(), version: 'v1' },
    });
  } catch (error) {
    console.error('[API] Webhook delete error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Webhook not found' } },
      { status: 404 },
    );
  }
}
