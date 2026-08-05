import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/events/live
 *
 * Server-Sent Events (SSE) endpoint for streaming live blockchain events.
 * Clients connect and receive new events as they are processed.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categories = searchParams.getAll('category');
  const eventTypes = searchParams.getAll('eventType');

  const encoder = new TextEncoder();
  let lastEventId: string | null = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`),
      );

      // Poll for new events every 2 seconds
      const pollInterval = setInterval(async () => {
        if (closed) {
          clearInterval(pollInterval);
          return;
        }

        try {
          const where: Record<string, unknown> = {};

          if (categories.length > 0) {
            where.category = { in: categories };
          }
          if (eventTypes.length > 0) {
            where.eventType = { in: eventTypes };
          }

          // Only get events newer than last sent
          if (lastEventId) {
            // Find the timestamp of the last sent event
            const lastEvent = await prisma.event.findUnique({
              where: { id: lastEventId },
              select: { timestamp: true },
            });
            if (lastEvent) {
              where.timestamp = { gt: lastEvent.timestamp };
            }
          }

          const events = await prisma.event.findMany({
            where,
            orderBy: { timestamp: 'asc' },
            take: 20,
          });

          for (const event of events) {
            lastEventId = event.id;

            const data = JSON.stringify({
              id: event.id,
              eventType: event.eventType,
              category: event.category,
              timestamp: event.timestamp,
              accountId: event.accountId,
              contractId: event.contractId,
              assetCode: event.assetCode,
              amount: event.amount,
            });

            controller.enqueue(
              encoder.encode(
                `id: ${event.id}\nevent: event\ndata: ${data}\nretry: 2000\n\n`,
              ),
            );
          }
        } catch (err) {
          console.error('[SSE] Poll error:', err);
        }
      }, 2000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(pollInterval);
      });
    },
    cancel() {
      closed = true;
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
