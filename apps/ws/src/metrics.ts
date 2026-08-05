export interface WsMetrics {
  connections: number;
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  uptime: number;
}
const metrics: WsMetrics = {
  connections: 0,
  messagesReceived: 0,
  messagesSent: 0,
  errors: 0,
  uptime: Date.now(),
};
export function incrementMetric(key: keyof Omit<WsMetrics, 'uptime'>): void {
  metrics[key]++;
}
export function getWsMetrics(): WsMetrics {
  return { ...metrics, uptime: Math.floor((Date.now() - metrics.uptime) / 1000) };
}
