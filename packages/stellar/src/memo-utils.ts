export function createMemoText(text: string, maxLength = 28): string {
  return text.slice(0, maxLength);
}
export function createMemoId(id: string): string {
  const num = BigInt(id);
  return num.toString();
}
export function isValidMemoText(text: string): boolean {
  return Buffer.byteLength(text, 'utf-8') <= 28;
}
export function isValidMemoId(id: string): boolean {
  try {
    const n = BigInt(id);
    return n >= 0n;
  } catch {
    return false;
  }
}
