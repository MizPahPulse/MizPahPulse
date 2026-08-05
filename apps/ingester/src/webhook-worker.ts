/**
 * Webhook delivery worker that processes queued webhook deliveries.
 * Integrated into the ingester service for retry logic and failure handling.
 */

import { prisma } from '@mizpah-pulse/database';
import { signWebhookPayload } from '@mizpah-pulse/stellar';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // Exponential-ish backoff in ms

interface PendingDelivery {
  id: string;
  subscriptionId: string;
  eventId: string;
  attempt: number;
  payload: unknown;
  endpoint: string;
  secret: string;
  maxRetries: number;
}

/**
 * Fetch pending webhook deliveries that need to be processed.
 */
async function getPendingDeliveries(): Promise<PendingDelivery[]> {
  const deliveries = await prisma.webhookDelivery.findMany({
    where: {
      status: { in: ['PENDING', 'RETRYING'] },
      attempt: { lt: MAX_RETRIES },
    },
    include: {
      subscription: {
        select: { endpoint: true, secret: true, maxRetries: true, isActive: true },
      },
    },
    take: 50,
    orderBy: { createdAt: 'asc' },
  });

  return deliveries
    .filter((d) => d.subscription.isActive)
    .map((d) => ({
      id: d.id,
      subscriptionId: d.subscriptionId,
      eventId: d.eventId,
      attempt: d.attempt,
      payload: d.payload,
      endpoint: d.subscription.endpoint,
      secret: d.subscription.secret,
      maxRetries: d.subscription.maxRetries,
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

  for (const delivery of deliveries) {
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
  }

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
