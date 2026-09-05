import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

/**
 * Issue #48 — cascade delete of webhook deliveries.
 *
 * `WebhookDelivery.subscriptionId` references `WebhookSubscription` with
 * `onDelete: Cascade` (schema + init migration), so deleting a subscription
 * must remove its deliveries at the database level. This test proves that
 * behavior against a real Postgres instance.
 *
 * The CI test job provisions Postgres and runs `prisma migrate deploy` before
 * `npx turbo run test`, so this runs there for real. Locally it requires a
 * reachable `DATABASE_URL`; when none is available the test skips so plain
 * `npm test` stays green for contributors without a database.
 */
test('deleting a subscription cascades to its deliveries (issue #48)', async (t) => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    t.skip('DATABASE_URL not set — skipping DB-backed cascade test');
    return;
  }

  const prisma = new PrismaClient();
  const subscriptionId = `sub_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    await prisma.$connect();
  } catch (error) {
    t.skip(`Postgres unreachable (${(error as Error).message}) — skipping cascade test`);
    await prisma.$disconnect().catch(() => {});
    return;
  }

  try {
    // Seed a subscription with two deliveries.
    const subscription = await prisma.webhookSubscription.create({
      data: {
        id: subscriptionId,
        userId: 'cascade-test-user',
        endpoint: 'https://example.com/webhook',
        secret: 'cascade-test-secret-123456',
        events: JSON.stringify(['pulse.fired']),
      },
    });
    await prisma.webhookDelivery.createMany({
      data: [
        {
          subscriptionId,
          eventId: 'evt_1',
          status: 'PENDING',
          payload: { type: 'pulse.fired' },
        },
        {
          subscriptionId,
          eventId: 'evt_2',
          status: 'DELIVERED',
          statusCode: 200,
          payload: { type: 'pulse.fired' },
        },
      ],
    });

    const before = await prisma.webhookDelivery.count({ where: { subscriptionId } });
    assert.equal(before, 2, 'seed must create 2 deliveries');

    // Deleting the subscription must remove its deliveries (cascade).
    await prisma.webhookSubscription.delete({ where: { id: subscription.id } });

    const remaining = await prisma.webhookDelivery.count({ where: { subscriptionId } });
    assert.equal(remaining, 0, 'deleting a subscription must cascade-delete its deliveries');
  } finally {
    // Best-effort cleanup so re-runs stay idempotent.
    await prisma.webhookDelivery.deleteMany({ where: { subscriptionId } }).catch(() => {});
    await prisma.webhookSubscription.deleteMany({ where: { id: subscriptionId } }).catch(() => {});
    await prisma.$disconnect().catch(() => {});
  }
});
