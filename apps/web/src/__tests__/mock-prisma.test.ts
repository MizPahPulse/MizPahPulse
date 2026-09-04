/**
 * Tests for the MOCK_API in-memory client (issue #100): the mock must serve
 * deterministic sample data with the same shapes routes expect from Prisma —
 * filtering/pagination, relation includes, groupBy, and row mutations.
 */
import { describe, it, expect } from 'vitest';
import { createMockPrisma } from '../../../../packages/database/src/mock';

describe('MOCK_API mock client', () => {
  it('seeds deterministic demo rows and supports findMany', async () => {
    const db = createMockPrisma() as unknown as {
      event: {
        findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
        count: (args: unknown) => Promise<number>;
      };
      $queryRaw: () => Promise<unknown>;
    };

    const events = await db.event.findMany({ take: 5 });
    expect(events).toHaveLength(5);

    const total = await db.event.count({});
    expect(total).toBeGreaterThan(10);
    await expect(db.$queryRaw()).resolves.toBeDefined();
  });

  it('filters, sorts, and paginates like prisma', async () => {
    const db = createMockPrisma() as unknown as {
      event: {
        findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
        count: (args: unknown) => Promise<number>;
      };
    };

    const payments = await db.event.findMany({
      where: { eventType: 'PAYMENT' },
      orderBy: { timestamp: 'desc' },
      take: 3,
    });
    expect(payments.length).toBeGreaterThan(0);
    expect(payments.every((e) => e.eventType === 'PAYMENT')).toBe(true);

    const count = await db.event.count({ where: { accountId: payments[0]!.accountId } });
    expect(count).toBeGreaterThan(0);
  });

  it('supports contains filters', async () => {
    const db = createMockPrisma() as unknown as {
      event: {
        findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
      };
    };
    const rows = await db.event.findMany({
      where: { pagingToken: { contains: 'mock-paging-1' } },
    });
    expect(rows.length).toBeGreaterThan(0);
  });

  it('handles the webhook include with nested take/orderBy', async () => {
    const db = createMockPrisma() as unknown as {
      webhookSubscription: {
        findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
      };
    };
    const subs = await db.webhookSubscription.findMany({
      where: { userId: 'default' },
      include: { deliveries: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
    expect(subs).toHaveLength(1);
    expect(subs[0]!.deliveries).toHaveLength(2);
  });

  it('supports reverse relation include with nested select', async () => {
    const db = createMockPrisma() as unknown as {
      webhookDelivery: {
        findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
      };
    };
    const delivery = await db.webhookDelivery.findFirst({
      where: { id: 'del-default-1' },
      include: { subscription: { select: { isActive: true } } },
    });
    expect(delivery?.subscription).toEqual({ isActive: true });
  });

  it('supports groupBy with _count', async () => {
    const db = createMockPrisma() as unknown as {
      event: {
        groupBy: (args: unknown) => Promise<Array<Record<string, unknown>>>;
      };
    };
    const rows = await db.event.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: [{ _count: { category: 'desc' } }],
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty('category');
    expect(rows[0]!._count).toHaveProperty('category');
  });

  it('creates, updates, deletes and counts rows', async () => {
    const db = createMockPrisma() as unknown as {
      monitoredWallet: {
        create: (args: unknown) => Promise<Record<string, unknown>>;
        update: (args: unknown) => Promise<Record<string, unknown>>;
        count: (args: unknown) => Promise<number>;
        delete: (args: unknown) => Promise<Record<string, unknown>>;
      };
    };
    const created = await db.monitoredWallet.create({
      data: { userId: 'default', publicKey: 'GABC123', network: 'TESTNET' },
    });
    expect(created.id).toBeTruthy();

    const updated = await db.monitoredWallet.update({
      where: { id: created.id },
      data: { label: 'Hot wallet' },
    });
    expect(updated.label).toBe('Hot wallet');

    expect(await db.monitoredWallet.count({ where: { publicKey: 'GABC123' } })).toBe(1);

    await db.monitoredWallet.delete({ where: { id: created.id } });
    expect(await db.monitoredWallet.count({ where: { publicKey: 'GABC123' } })).toBe(0);
  });
});
