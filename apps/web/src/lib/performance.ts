export function measureTime<T>(label: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  if (duration > 100) console.warn(`[PERF] ${label}: ${duration.toFixed(1)}ms`);
  return result;
}

export async function measureTimeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  if (duration > 500) console.warn(`[PERF] ${label}: ${duration.toFixed(0)}ms`);
  return result;
}

export function debounceForPerformance<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }) as unknown as T;
}
