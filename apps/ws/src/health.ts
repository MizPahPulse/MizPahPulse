/**
 * Health payload for the WebSocket service (issue #38).
 *
 * The ingester already exposes `/health`; this adds the same capability to the
 * ws service. `buildHealthPayload` is a pure function so the shape can be unit
 * tested without booting the socket server or connecting to Redis.
 */

export interface WsHealthInput {
  service: string;
  version: string;
  uptime: number;
  activeConnections: number;
  totalConnections: number;
  peakConnections: number;
  redisConnected: boolean;
}

export interface WsHealthPayload {
  status: 'ok';
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  connections: {
    active: number;
    total: number;
    peak: number;
  };
  redis: 'connected' | 'disconnected';
}

export function buildHealthPayload(input: WsHealthInput): WsHealthPayload {
  return {
    status: 'ok',
    service: input.service,
    version: input.version,
    uptime: input.uptime,
    timestamp: new Date().toISOString(),
    connections: {
      active: input.activeConnections,
      total: input.totalConnections,
      peak: input.peakConnections,
    },
    redis: input.redisConnected ? 'connected' : 'disconnected',
  };
}
