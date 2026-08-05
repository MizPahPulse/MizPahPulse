/**
 * Retry an async function with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; onRetry?: (attempt: number, error: Error) => void } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, onRetry } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = baseDelay * Math.pow(2, attempt);
      onRetry?.(attempt + 1, err as Error);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Retry failed unexpectedly');
}
