import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Audit logging middleware: track create/update/delete operations
prisma.$use(async (params, next) => {
  const result = await next(params);

  // Only log in non-test environments for performance
  if (process.env.NODE_ENV === 'test') return result;

  // Log create/update/delete on key models
  const auditedModels = ['Event', 'WebhookSubscription', 'MonitoredWallet', 'ApiKey'];
  if (
    auditedModels.includes(params.model || '') &&
    ['create', 'update', 'delete', 'upsert'].includes(params.action)
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          action: `DB_${params.action.toUpperCase()}`,
          resource: params.model || 'unknown',
          resourceId: (result as { id?: string })?.id,
          details: {
            model: params.model,
            action: params.action,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch {
      // Don't let audit failure break the main operation
    }
  }

  return result;
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

export * from '@prisma/client';
