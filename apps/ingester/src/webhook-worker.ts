/**
 * Webhook delivery worker that processes queued webhook deliveries.
 * Integrated into the ingester service for retry logic and failure handling.
 */

import { prisma } from '@mizpah-pulse/database';
import { signWebhookPayload } from '@mizpah-pulse/stellar';

const MAX_CONCURRENT_DELIVERIES = 10;
const DEFAULT_RETRY_DELAY_MS = 5000;
const JITTER_MS = 500;

interface PendingDelivery {
  id: string;
  subscriptionId: string;
  eventId: string;
  attempt: number;
  payload: unknown;
  endpoint: string;
  secret: string;
  maxRetries: number;
  retryDelayMs: number;
}

/**
 * Fetch pending webhook deliveries that need to be processed.
 *
 * Each subscription carries its own `maxRetries` and `retryDelayMs`, so the
 * worker must honor those instead of a hardcoded retry budget. A delivery is
 * only picked up once its backoff window has elapsed (based on the last
 * update time plus the subscription's configured delay).
 */
async function getPendingDeliveries(): Promise<PendingDelivery[]> {
  const deliveries = await prisma.webhookDelivery.findMany({
    where: {
      status: { in: ['PENDING', 'RETRYING'] },
    },
    include: {
      subscription: {
        select: {
          endpoint: true,
          secret: true,
          maxRetries: true,
          retryDelayMs: true,
          isActive: true,
        },
      },
    },
    take: 100,
    orderBy: { createdAt: 'asc' },
  });

  const now = Date.now();

  return deliveries
    .filter((d) => d.subscription.isActive)
    .filter((d) => {
      // Respect the subscription's own retry budget (not a hardcoded constant).
      const budget = d.subscription.maxRetries;
      if (d.attempt >= budget) return false;
      // Backoff: wait at least the configured delay (plus jitter) after the
      // last attempt before retrying.
      const delay = d.subscription.retryDelayMs || DEFAULT_RETRY_DELAY_MS;
      const nextAllowed = new Date(d.updatedAt).getTime() + delay + JITTER_MS;
      return nextAllowed <= now;
    })
    .map((d) => ({
      id: d.id,
      subscriptionId: d.subscriptionId,
      eventId: d.eventId,
      attempt: d.attempt,
      payload: d.payload,
      endpoint: d.subscription.endpoint,
      secret: d.subscription.secret,
      maxRetries: d.subscription.maxRetries,
      retryDelayMs: d.subscription.retryDelayMs || DEFAULT_RETRY_DELAY_MS,
    }));
}

/**
 * Attempt to deliver a webhook payload to the subscriber's endpoint.
 */
async function deliverWebhook(
  delivery: PendingDelivery,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const body = JSON.stringify(delivery.payload);
  const signature = signWebhookPayload(body, delivery.secret);

  try {
    const response = await fetch(delivery.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Delivery-ID': delivery.id,
        'User-Agent': 'MizPahPulse-Webhook/1.0',
      },
      body,
      signal: AbortSignal.timeout(10_000), // 10 second timeout
    });

    if (response.ok) {
      return { success: true, statusCode: response.status };
    }

    return {
      success: false,
      statusCode: response.status,
      error: `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown delivery error',
    };
  }
}

/** Run an async task with a bounded number of concurrent workers. */
async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      if (item !== undefined) await task(item);
    }
  });
  await Promise.all(workers);
}

/**
 * Process all pending webhook deliveries.
 */
export async function processWebhookDeliveries(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const deliveries = await getPendingDeliveries();
  let succeeded = 0;
  let failed = 0;

  await runWithConcurrency(deliveries, MAX_CONCURRENT_DELIVERIES, async (delivery) => {
    const result = await deliverWebhook(delivery);

    if (result.success) {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'SUCCESS',
          statusCode: result.statusCode,
          completedAt: new Date(),
        },
      });
      succeeded++;
    } else {
      const newAttempt = delivery.attempt + 1;
      const isFinal = newAttempt >= delivery.maxRetries;

      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: isFinal ? 'FAILED' : 'RETRYING',
          attempt: newAttempt,
          error: result.error,
          ...(isFinal ? { completedAt: new Date() } : {}),
        },
      });

      // Update subscription failed count
      if (isFinal) {
        await prisma.webhookSubscription.update({
          where: { id: delivery.subscriptionId },
          data: { failedDeliveries: { increment: 1 } },
        });
      }

      failed++;
    }
  });

  return { processed: deliveries.length, succeeded, failed };
}

/**
 * Start the webhook delivery worker loop.
 * Runs every 10 seconds.
 */
export function startWebhookWorker(): () => void {
  console.log('[Webhook Worker] Starting delivery worker...');

  const interval = setInterval(async () => {
    try {
      const result = await processWebhookDeliveries();
      if (result.processed > 0) {
        console.log(
          `[Webhook Worker] Processed ${result.processed} deliveries: ${result.succeeded} succeeded, ${result.failed} failed`,
        );
      }
    } catch (err) {
      console.error('[Webhook Worker] Error:', err);
    }
  }, 10_000);

  return () => clearInterval(interval);
}
