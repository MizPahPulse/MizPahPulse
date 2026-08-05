import type { Prisma } from '@prisma/client';

/** Optimized query helpers using Prisma compound indexes */

export const eventSearchQuery = (q: string): Prisma.EventWhereInput => ({
  OR: [
    { transactionHash: { contains: q, mode: 'insensitive' } },
    { accountId: { contains: q, mode: 'insensitive' } },
    { contractId: { contains: q, mode: 'insensitive' } },
    { eventType: { contains: q, mode: 'insensitive' } },
  ],
});

export const eventsByAccountQuery = (accountId: string): Prisma.EventWhereInput => ({
  accountId,
});

export const eventsByContractQuery = (contractId: string): Prisma.EventWhereInput => ({
  contractId,
});
