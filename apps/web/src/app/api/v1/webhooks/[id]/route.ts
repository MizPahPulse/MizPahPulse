import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    const webhook = await prisma.webhookSubscription.findUnique({ where: { id } });
    if (!webhook) return errorResponse(ErrorCode.NOT_FOUND, 'Webhook not found');

    await prisma.webhookSubscription.delete({ where: { id } });
    return successResponse({ deleted: true, id });
  } catch (error) {
    console.error('[API] Webhook delete error:', error);
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to delete webhook');
  }
}
