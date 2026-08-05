export function timeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message || 'Timeout')), ms))]);
}
export async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) { try { return await fn(); } catch (e) { if (i === maxRetries) throw e; await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i))); } }
  throw new Error('Unreachable');
}
export function delay<T>(ms: number, value?: T): Promise<T> { return new Promise(r => setTimeout(() => r(value as T), ms)); }
