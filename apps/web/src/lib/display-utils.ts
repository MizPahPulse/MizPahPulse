export function truncateAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}
export function truncateHash(hash: string): string {
  return hash.slice(0, 10) + '...' + hash.slice(-6);
}
export function formatXLM(amount: string): string {
  const n = parseFloat(amount);
  if (isNaN(n)) return '0 XLM';
  return n.toLocaleString(undefined, { maximumFractionDigits: 7 }) + ' XLM';
}
