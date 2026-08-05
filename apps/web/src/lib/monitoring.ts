/**
 * Simple in-process monitoring utility.
 * Tracks request counts, error rates, and timing for health checks.
 */

interface MetricsSnapshot {
  totalRequests: number;
  errorRequests: number;
  avgResponseTime: number;
  lastMinuteRequests: number;
  uptime: number;
  startTime: number;
}

const metrics = {
  totalRequests: 0,
  errorRequests: 0,
  responseTimes: [] as number[],
  lastMinuteTimestamps: [] as number[],
  startTime: Date.now(),
};

/**
 * Record a completed API request for metrics tracking.
 */
export function recordRequest(durationMs: number, isError: boolean): void {
  metrics.totalRequests++;
  if (isError) metrics.errorRequests++;

  // Track response times (keep last 100 for percentile calculation)
  metrics.responseTimes.push(durationMs);
  if (metrics.responseTimes.length > 100) metrics.responseTimes.shift();

  // Track last-minute requests
  const now = Date.now();
  metrics.lastMinuteTimestamps.push(now);
  // Clean up old entries
  metrics.lastMinuteTimestamps = metrics.lastMinuteTimestamps.filter((t) => now - t < 60_000);
}

/**
 * Get current monitoring metrics snapshot.
 */
export function getMetricsSnapshot(): MetricsSnapshot {
  const now = Date.now();
  const responseTimes = metrics.responseTimes;

  const avgResponseTime =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

  return {
    totalRequests: metrics.totalRequests,
    errorRequests: metrics.errorRequests,
    avgResponseTime,
    lastMinuteRequests: metrics.lastMinuteTimestamps.length,
    uptime: Math.floor((now - metrics.startTime) / 1000),
    startTime: metrics.startTime,
  };
}

/**
 * Get error rate as a percentage (0-100).
 */
export function getErrorRate(): number {
  if (metrics.totalRequests === 0) return 0;
  return Math.round((metrics.errorRequests / metrics.totalRequests) * 100);
}
