import { prisma } from './index';

/** Query helpers for common database access patterns */

export async function eventExists(pagingToken: string): Promise<boolean> {
  const count = await prisma.event.count({ where: { pagingToken } });
  return count > 0;
}

export async function getEventStats(daysBack = 1) {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const [total, recent] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { timestamp: { gte: since } } }),
  ]);
  return { total, recent };
}

export async function getCategoryCounts() {
  const results = await prisma.event.groupBy({
    by: ['category'],
    _count: true,
    orderBy: { _count: { category: 'desc' } },
  });
  return results.map((r) => ({ category: r.category, count: r._count }));
}

export async function getTopContracts(limit = 5) {
  return prisma.event.groupBy({
    by: ['contractId'],
    where: { contractId: { not: null } },
    _count: true,
    orderBy: { _count: { contractId: 'desc' } },
    take: limit,
  });
}
