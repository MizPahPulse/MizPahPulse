export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.replace('#','').match(/.{1,2}/g);
  if (!match || match.length !== 3) return null;
  const [r, g, b] = match.map((x) => parseInt(x, 16));
  if (r === undefined || g === undefined || b === undefined) return null;
  return { r, g, b };
}
export function getContrastColor(hex: string): '#000' | '#fff' {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000' : '#fff';
}
