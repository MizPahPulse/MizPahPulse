import { Queue, Worker } from 'bullmq';
import { getNetworkConfig, createHorizonServer, getSorobanRpc, categorizeEventType, mapToEventType, normalizeEventPayload } from '@mizpah-pulse/stellar';
import { prisma } from '@mizpah-pulse/database';
import { Horizon } from '@stellar/stellar-sdk';
import { v4 as uuidv4 } from 'uuid';
import { startWebhookWorker } from './webhook-worker';
import type { RawStellarEvent } from '@mizpah-pulse/types';

/**
 * MizpahPulse Event Ingestion Engine
 *
 * Monitors Stellar blockchain activity via Horizon SSE and Soroban RPC polling.
 * Pushes raw events into a Redis-backed queue for async processing.
 */

// ──────────────────────────────────────────────
// Queue Configuration
// ──────────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = {
  url: REDIS_URL,
};

const RAW_EVENT_QUEUE = 'raw-stellar-events';
const PROCESSED_EVENT_QUEUE = 'processed-events';
const DEAD_LETTER_QUEUE = 'dead-letter-events';

const rawEventQueue = new Queue<RawStellarEvent>(RAW_EVENT_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

const processedEventQueue = new Queue(PROCESSED_EVENT_QUEUE, { connection });
const deadLetterQueue = new Queue(DEAD_LETTER_QUEUE, { connection });

// Redis Pub/Sub client (lazy init in main)
let pubClient: Awaited<ReturnType<typeof import('ioredis').default>> | null = null;
const REDIS_CHANNEL = 'mizpah-pulse:events';

// Track active timers for graceful shutdown
const activeTimers: ReturnType<typeof setInterval>[] = [];

// ──────────────────────────────────────────────
// Horizon SSE Stream
// ──────────────────────────────────────────────
async function startHorizonStream() {
  const config = getNetworkConfig();
  console.log(`[Ingester] Starting Horizon SSE stream on ${config.network} (${config.horizonUrl})`);

  let lastPagingToken: string | null = null;

  // Fetch latest ledger to start streaming from
  try {
    const server = createHorizonServer();
    const latestLedger = await server.ledgers().order('desc').limit(1).call();
    if (latestLedger.records[0]) {
      lastPagingToken = latestLedger.records[0].paging_token;
      console.log(`[Ingester] Starting from ledger paging token: ${lastPagingToken}`);
    }
  } catch (err) {
    console.warn('[Ingester] Could not fetch latest ledger, starting from "now"');
  }

  const cursor = lastPagingToken ?? 'now';

  const streamServer = createHorizonServer();

  streamServer
    .transactions()
    .cursor(cursor)
    .stream({
      onmessage: async (tx) => {
        const rawEvent: RawStellarEvent = {
          source: 'HORIZON',
          type: 'transaction',
          payload: tx as unknown as Record<string, unknown>,
          capturedAt: new Date().toISOString(),
          pagingToken: tx.paging_token,
          transactionHash: tx.id,
        };

        await rawEventQueue.add(`horizon-${uuidv4()}`, rawEvent);
        console.log(`[Ingester] Queued Horizon tx: ${tx.id}`);
      },
      onerror: (err) => {
        console.error('[Ingester] Horizon SSE error:', err);
        // Attempt reconnect
        setTimeout(startHorizonStream, 5000);
      },
    });
}

// ──────────────────────────────────────────────
// Soroban RPC Event Polling
// ──────────────────────────────────────────────
async function startSorobanPolling() {
  const config = getNetworkConfig();
  console.log(`[Ingester] Starting Soroban RPC polling on ${config.sorobanRpcUrl}`);

  const { getSorobanRpc } = await import('@mizpah-pulse/stellar');
  const rpc = getSorobanRpc();

  let lastLedger = 0;

  try {
    const latest = await rpc.getLatestLedger();
    lastLedger = latest.sequence;
    console.log(`[Ingester] Starting Soroban poll from ledger: ${lastLedger}`);
  } catch {
    console.warn('[Ingester] Could not get latest Soroban ledger, starting from 0');
  }

  const timer = setInterval(async () => {
    try {
      const response = await rpc.getEvents({
        startLedger: lastLedger > 0 ? lastLedger - 1 : undefined,
        limit: 100,
      });

      if (response.events && response.events.length > 0) {
        for (const evt of response.events) {
          const rawEvent: RawStellarEvent = {
            source: 'SOROBAN_RPC',
            type: 'contract_event',
            payload: evt as unknown as Record<string, unknown>,
            capturedAt: new Date().toISOString(),
            pagingToken: evt.pagingToken,
            transactionHash: evt.txHash,
          };

          await rawEventQueue.add(`soroban-${uuidv4()}`, rawEvent);
        }

        const maxLedger = Math.max(...response.events.map((e) => e.ledger));
        if (maxLedger > lastLedger) {
          lastLedger = maxLedger;
        }

        console.log(`[Ingester] Polled ${response.events.length} Soroban events, ledger: ${lastLedger}`);
      }
    } catch (err) {
      console.error('[Ingester] Soroban polling error:', err);
    }
  }, 5000);

  activeTimers.push(timer);
  return () => clearInterval(timer);
}

// ──────────────────────────────────────────────
// Event Processing Worker
// ──────────────────────────────────────────────
const eventProcessor = new Worker<RawStellarEvent>(
  RAW_EVENT_QUEUE,
  async (job) => {
    const rawEvent = job.data;
    console.log(`[Processor] Processing event: ${rawEvent.type} from ${rawEvent.source}`);

    try {
      // Deduplication check
      if (rawEvent.pagingToken) {
        const existing = await prisma.event.findUnique({
          where: { pagingToken: rawEvent.pagingToken },
        });
        if (existing) {
          console.log(`[Processor] Duplicate event skipped: ${rawEvent.pagingToken}`);
          return { status: 'duplicate' };
        }
      }

  // Parse and normalize the event
        const category = categorizeEventType(rawEvent.type);
        const eventType = mapToEventType(rawEvent.type);
        const normalizedPayload = normalizeEventPayload(rawEvent.payload);

      // Store processed event
      const stored = await prisma.event.create({
        data: {
          eventType,
          source: rawEvent.source,
          category,
          transactionHash: rawEvent.transactionHash ?? 'unknown',
          ledgerSequence: BigInt(
            (normalizedPayload.ledger as number) ?? (normalizedPayload.ledger_attr as number) ?? 0,
          ),
          pagingToken: rawEvent.pagingToken ?? `gen-${uuidv4()}`,
          timestamp: rawEvent.capturedAt,
          accountId: normalizedPayload.source_account as string,
          payload: normalizedPayload,
        },
      });

      console.log(`[Processor] Stored event: ${stored.id} (${eventType})`);

      // Publish to Redis Pub/Sub for real-time WebSocket broadcast
      try {
        await pubClient?.publish(
          REDIS_CHANNEL,
          JSON.stringify({
            channel: 'feed:all',
            eventType: stored.eventType,
            data: {
              eventId: stored.id,
              category: stored.category,
              accountId: stored.accountId,
              amount: stored.amount,
              assetCode: stored.assetCode,
              timestamp: stored.timestamp,
            },
            timestamp: new Date().toISOString(),
            sequence: Date.now(),
          }),
        );
      } catch (pubErr) {
        console.error('[Processor] Redis publish error:', pubErr);
      }

      // Queue for downstream processing (notifications, webhooks, WebSocket broadcast)
      await processedEventQueue.add(`processed-${stored.id}`, {
        eventId: stored.id,
        eventType: stored.eventType,
        category: stored.category,
      });

      return { status: 'processed', eventId: stored.id };
    } catch (err) {
      console.error(`[Processor] Error processing event:`, err);
      throw err;
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: { max: 50, duration: 1000 },
  },
);

// Dead letter handler
eventProcessor.on('failed', async (job, err) => {
  if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
    console.error(`[Processor] Event failed permanently: ${job.id}`, err);
    await deadLetterQueue.add(`dlq-${job.id}`, { ...job.data, error: err.message });
  }
});

// ──────────────────────────────────────────────
// Startup
// ──────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  MizpahPulse — Event Ingestion Engine');
  console.log('═══════════════════════════════════════════');

  // Verify database connection
  try {
    await prisma.$connect();
    console.log('[Ingester] Database connected');
  } catch (err) {
    console.error('[Ingester] Database connection failed:', err);
    process.exit(1);
  }

  // Verify Redis connection
  try {
    const Redis = (await import('ioredis')).default;
    const redis = new Redis(REDIS_URL);
    await redis.ping();
    await redis.quit();
    console.log('[Ingester] Redis connected');

    // Initialize Redis Pub/Sub client for broadcasting processed events
    pubClient = new Redis(REDIS_URL);
    await pubClient.ping();
    console.log('[Ingester] Redis Pub/Sub connected');
  } catch (err) {
    console.error('[Ingester] Redis connection failed:', err);
    process.exit(1);
  }

  // Start Horizon SSE streaming
  startHorizonStream().catch((err) =>
    console.error('[Ingester] Horizon stream failed to start:', err),
  );

  // Start Soroban event polling
  startSorobanPolling().catch((err) =>
    console.error('[Ingester] Soroban polling failed to start:', err),
  );

  console.log('[Ingester] Event ingestion engine is running');

  // Start webhook delivery worker
  const stopWebhookWorker = startWebhookWorker();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Ingester] Shutting down...');
    stopWebhookWorker();
    activeTimers.forEach((t) => clearInterval(t));
    await pubClient?.quit();
    await rawEventQueue.close();
    await processedEventQueue.close();
    await deadLetterQueue.close();
    await eventProcessor.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main();
