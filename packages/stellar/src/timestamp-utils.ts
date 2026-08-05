export function ledgerTimestampToDate(ts: number): Date {
  return new Date(ts * 1000);
}

export function dateToLedgerTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function formatLedgerAge(ledgerTs: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ledgerTs;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function isLedgerRecent(ledgerTs: number, maxAgeSeconds = 300): boolean {
  return (Math.floor(Date.now() / 1000) - ledgerTs) < maxAgeSeconds;
}
