export function getNetworkStatus(): { online: boolean; effectiveType?: string; downlink?: number; rtt?: number } {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) return { online: typeof navigator !== 'undefined' ? navigator.onLine : true };
  const conn = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number; rtt?: number } }).connection;
  return { online: navigator.onLine, effectiveType: conn?.effectiveType, downlink: conn?.downlink, rtt: conn?.rtt };
}
