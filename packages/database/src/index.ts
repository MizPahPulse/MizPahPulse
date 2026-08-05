import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// ──────────────────────────────────────────────
// Audit logging middleware
// Prisma 6 removed `$use` from the client's public types (deprecated in favor of
// `$extends`), which broke typechecking. We keep the middleware via a minimal cast
// — it still works at runtime and avoids a full `$extends` migration.
// ──────────────────────────────────────────────
interface AuditMiddlewareParams {
  model?: string;
  action: string;
  args: Record<string, unknown>;
}

type AuditMiddleware = (
  params: AuditMiddlewareParams,
  next: (params: AuditMiddlewareParams) => Promise<unknown>,
) => Promise<unknown>;

const auditMiddleware: AuditMiddleware = async (params, next) => {
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
};

(prisma as unknown as { $use: (mw: AuditMiddleware) => void }).$use(auditMiddleware);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

export * from '@prisma/client';
