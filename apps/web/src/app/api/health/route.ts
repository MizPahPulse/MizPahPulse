import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { APP_VERSION } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { recordRequest, getMetricsSnapshot, getErrorRate } from '@/lib/monitoring';
import { withRequestId, REQUEST_ID_HEADER } from '@/lib/request-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: Record<string, { status: 'ok' | 'error'; latencyMs: number; message?: string }>;
}

/**
 * GET /api/health
 *
 * Health check endpoint for monitoring, load balancers, and orchestration.
 * Checks database connectivity and overall service health.
 */
async function GETHandler(request: Request): Promise<NextResponse> {
  const start = Date.now();
  const checks: HealthStatus['checks'] = {};
  const requestId = request.headers.get(REQUEST_ID_HEADER) ?? 'n/a';

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'ok',
      latencyMs: Date.now() - dbStart,
    };
  } catch (err) {
    logger.error(`[Health] Database check failed (requestId=${requestId}):`, err);
    checks.database = {
      status: 'error',
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : 'Database connection failed',
    };
  }

  // Check Redis connectivity (if configured)
  if (process.env.REDIS_URL) {
    try {
      const redisStart = Date.now();
      const Redis = (await import('ioredis')).default;
      const redis = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
      await redis.ping();
      await redis.quit();
      checks.redis = {
        status: 'ok',
        latencyMs: Date.now() - redisStart,
      };
    } catch (err) {
      checks.redis = {
        status: 'error',
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : 'Redis connection failed',
      };
    }
  }

  // Determine overall health
  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  const anyError = Object.values(checks).some((c) => c.status === 'error');

  const overallStatus: HealthStatus['status'] = allOk
    ? 'healthy'
    : anyError
      ? 'unhealthy'
      : 'degraded';

  recordRequest(Date.now() - start, overallStatus === 'unhealthy');

  const health: HealthStatus & {
    metrics: ReturnType<typeof getMetricsSnapshot>;
    errorRate: number;
  } = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    uptime: process.uptime(),
    checks,
    metrics: getMetricsSnapshot(),
    errorRate: getErrorRate(),
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${Date.now() - start}ms`,
    },
  });
}

export const GET = withRequestId(GETHandler);
