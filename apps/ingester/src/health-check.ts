/** Health check utilities for the ingester worker */

import { createServer } from 'http';

export interface IngesterHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  horizonConnected: boolean;
  sorobanPolling: boolean;
  queueSize: number;
  processedEvents: number;
  lastEventAt: number | null;
  uptime: number;
}

const health: IngesterHealth = {
  status: 'healthy',
  horizonConnected: false,
  sorobanPolling: false,
  queueSize: 0,
  processedEvents: 0,
  lastEventAt: null,
  uptime: Date.now(),
};

export function updateHealth(partial: Partial<IngesterHealth>): void {
  Object.assign(health, partial);
  // Derive an overall status from the component flags.
  if (!health.horizonConnected && !health.sorobanPolling) {
    health.status = 'unhealthy';
  } else if (!health.horizonConnected || !health.sorobanPolling) {
    health.status = 'degraded';
  } else {
    health.status = 'healthy';
  }
}

export function recordProcessedEvent(): void {
  health.processedEvents++;
  health.lastEventAt = Date.now();
}

export function getHealth(): Readonly<IngesterHealth> {
  return { ...health, uptime: Math.floor((Date.now() - health.uptime) / 1000) };
}

/**
 * Start a lightweight HTTP health server (default port 8080, override with
 * HEALTH_PORT). Returns a stop function for graceful shutdown.
 */
export function startHealthServer(): () => void {
  const port = parseInt(process.env.HEALTH_PORT || '8080', 10);
  const server = createServer((_req, res) => {
    const data = getHealth();
    const statusCode = data.status === 'healthy' ? 200 : data.status === 'degraded' ? 200 : 503;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  });

  server.listen(port, () => {
    console.log(`[Ingester] Health server listening on port ${port}`);
  });

  return () => {
    server.close();
  };
}
