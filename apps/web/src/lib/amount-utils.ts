export function parseStellarAmount(amount: string): number {
  const n = parseFloat(amount);
  return isNaN(n) ? 0 : n;
}
export function formatStellarAmount(amount: string | number, asset = 'XLM'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '0 ' + asset;
  return n.toLocaleString(undefined, { maximumFractionDigits: 7 }) + ' ' + asset;
}
export function compareAmounts(a: string, b: string): number {
  return parseStellarAmount(a) - parseStellarAmount(b);
}
