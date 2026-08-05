import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function createPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // Audit logging via Prisma 6's $extends query extension.
  // Prisma 6 removed the $use middleware entirely (types AND runtime), so
  // calling it threw "e.$use is not a function" at module load. $extends is
  // the supported replacement with identical semantics: track create/update/
  // delete/upsert on key models without letting audit failures break the
  // main operation.
  const auditExtension = Prisma.defineExtension({
    query: {
      $allOperations({ model, operation, args, query }) {
        return query(args).then(async (result) => {
          if (process.env.NODE_ENV === 'test') return result;

          const auditedModels = ['Event', 'WebhookSubscription', 'MonitoredWallet', 'ApiKey'];
          if (
            model &&
            auditedModels.includes(model) &&
            ['create', 'update', 'delete', 'upsert'].includes(operation)
          ) {
            try {
              const ctx = Prisma.getExtensionContext(this) as unknown as PrismaClient;
              await ctx.auditLog.create({
                data: {
                  action: `DB_${operation.toUpperCase()}`,
                  resource: model,
                  resourceId: (result as { id?: string })?.id,
                  details: {
                    model,
                    operation,
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
      },
    },
  });

  return base.$extends(auditExtension);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

export * from '@prisma/client';
