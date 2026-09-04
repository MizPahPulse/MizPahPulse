import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { z } from 'zod';
import { errorResponse, ErrorCode } from '@/lib/api-errors';
import { parseLastEventId } from '@/lib/sse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Query validation for the live stream. Filters must be non-empty strings and
 * are capped so a single request can't ask the server to fan out hundreds of
 * `IN` clauses (issue #32).
 */
const LiveEventsQuerySchema = z.object({
  categories: z.array(z.string().min(1).max(64)).max(20).optional(),
  eventTypes: z.array(z.string().min(1).max(64)).max(20).optional(),
});

/**
 * GET /api/v1/events/live
 *
 * Server-Sent Events (SSE) endpoint for streaming live blockchain events.
 * Clients connect and receive new events as they are processed. A client can
 * send `Last-Event-ID: <eventId>` to resume from where it left off.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const queryResult = LiveEventsQuerySchema.safeParse({
    categories: searchParams.getAll('category'),
    eventTypes: searchParams.getAll('eventType'),
  });
  if (!queryResult.success) {
    return errorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid live stream filter parameters',
      queryResult.error.flatten() as unknown as Record<string, unknown>,
    );
  }
  const categories = queryResult.data.categories ?? [];
  const eventTypes = queryResult.data.eventTypes ?? [];

  const encoder = new TextEncoder();
  let lastEventId: string | null = parseLastEventId(request.headers.get('last-event-id'));
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
              encoder.encode(`id: ${event.id}\nevent: event\ndata: ${data}\nretry: 2000\n\n`),
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
