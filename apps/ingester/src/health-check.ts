/** Health check utilities for the ingester worker */

export interface IngesterHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  horizonConnected: boolean;
  sorobanPolling: boolean;
  queueSize: number;
  uptime: number;
  lastEventAt: number | null;
}

const health: IngesterHealth = {
  status: 'healthy',
  horizonConnected: false,
  sorobanPolling: false,
  queueSize: 0,
  uptime: Date.now(),
  lastEventAt: null,
};

export function updateHealth(partial: Partial<IngesterHealth>): void {
  Object.assign(health, partial);
}

export function getHealth(): Readonly<IngesterHealth> {
  return { ...health, uptime: Math.floor((Date.now() - health.uptime) / 1000) };
}
