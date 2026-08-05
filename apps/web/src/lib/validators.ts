export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export function isValidUrl(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}
export function isValidPositiveNumber(val: string): boolean {
  const n = parseFloat(val);
  return !isNaN(n) && n > 0;
}
export function isValidHexColor(hex: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}
