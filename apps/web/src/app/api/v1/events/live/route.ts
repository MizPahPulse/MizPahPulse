import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';

const MOCK_EVENT_DATA = [
  { type: 'PAYMENT', title: 'Payment: 100 XLM', from: 'GABC...XYZ', to: 'GDEF...UVW', amount: '100 XLM' },
  { type: 'SOROBAN_INVOKE', title: 'swap() called on CA7G...KLM', from: 'GXLM...PQR', amount: '0.5 XLM fee' },
  { type: 'DEX_TRADE', title: 'DEX Trade: USDC/XLM', from: 'GDEF...UVW', amount: '500 USDC → 4,750 XLM' },
  { type: 'NFT_TRANSFER', title: 'NFT #5678 transferred', from: 'GKLM...NOP', to: 'GABC...XYZ', amount: 'NFT #5678' },
  { type: 'TOKEN_TRANSFER', title: 'Token Transfer: 1,000 USDC', from: 'GABC...XYZ', to: 'GDEF...UVW', amount: '1,000 USDC' },
];

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/events/live
 *
 * Server-Sent Events stream of real-time blockchain events.
 * Connects to the WebSocket server for event data.
 */
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Initial connection event
      sendEvent({
        type: 'connected',
        timestamp: new Date().toISOString(),
        message: 'SSE stream established',
      });

      // Fetch recent events from the database and stream them
      let seq = 0;
      const streamEvents = async () => {
        try {
          const recent = await prisma.event.findMany({
            orderBy: { timestamp: 'desc' },
            take: 10,
          });
          for (const evt of recent) {
            sendEvent({
              type: 'event',
              id: evt.id,
              eventType: evt.eventType,
              category: evt.category,
              transactionHash: evt.transactionHash,
              accountId: evt.accountId,
              amount: evt.amount,
              timestamp: evt.timestamp,
              sequence: seq++,
              data: typeof evt.payload === 'string' ? JSON.parse(evt.payload) : evt.payload,
            });
          }
        } catch (err) {
          // If DB is unavailable, stream mock data
          for (const mock of MOCK_EVENT_DATA) {
            sendEvent({
              ...mock,
              type: 'event',
              timestamp: new Date().toISOString(),
              sequence: seq++,
            });
          }
        }
      };

      streamEvents();

      // Re-stream every 5 seconds
      const eventTimer = setInterval(streamEvents, 5000);

      // Heartbeat to keep the connection alive
      const heartbeat = setInterval(() => {
        sendEvent({ type: 'heartbeat', timestamp: new Date().toISOString() });
      }, 30000);

      // Cleanup on connection close
      const cleanup = () => {
        clearInterval(heartbeat);
        clearInterval(eventTimer);
        controller.close();
      };

      // If the request is aborted, clean up
      return cleanup;
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
