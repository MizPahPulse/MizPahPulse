import { PrismaClient, Prisma } from '@prisma/client';
import { createMockPrisma, isMockApiEnabled } from './mock';

type RealPrisma = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: RealPrisma | undefined;
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

/**
 * Resolve the prisma client used by the API (issue #100).
 *
 * When MOCK_API=1 (or `true`) the app runs without Postgres/Redis: an
 * in-memory client serves sample data with the same response shapes as the
 * real client, so routes need zero code changes.
 */
function resolveClient(): RealPrisma {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = isMockApiEnabled()
    ? (createMockPrisma() as unknown as RealPrisma)
    : createPrismaClient();
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
  return client;
}

export const prisma = resolveClient();

export default prisma;

export * from '@prisma/client';
