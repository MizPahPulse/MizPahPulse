/**
 * Simple caching utility for API responses.
 * Supports in-memory (development) and Redis (production) backends.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

// Clean up expired entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (now > entry.expiresAt) memoryCache.delete(key);
  }
}, 60_000);

/**
 * Get a cached value.
 * Returns null if the key doesn't exist or has expired.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    // Try Redis first if available
    if (process.env.REDIS_URL) {
      const Redis = (await import('ioredis')).default;
      const redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      try {
        const value = await redis.get(`cache:${key}`);
        await redis.quit();
        if (value) return JSON.parse(value) as T;
      } catch {
        await redis.quit();
      }
    }
  } catch {
    // Fall through to memory cache
  }

  const entry = memoryCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Set a cached value with TTL in milliseconds.
 */
export async function setCache<T>(key: string, data: T, ttlMs = 30_000): Promise<void> {
  // Always set in memory
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });

  // Try Redis if available
  try {
    if (process.env.REDIS_URL) {
      const Redis = (await import('ioredis')).default;
      const redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      try {
        await redis.set(`cache:${key}`, JSON.stringify(data), 'PX', ttlMs);
      } catch {
        // Silently fail - memory cache is the fallback
      }
      await redis.quit();
    }
  } catch {
    // Silently fail
  }
}

/**
 * Invalidate a cache entry
 */
export async function invalidateCache(key: string): Promise<void> {
  memoryCache.delete(key);

  try {
    if (process.env.REDIS_URL) {
      const Redis = (await import('ioredis')).default;
      const redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      await redis.del(`cache:${key}`);
      await redis.quit();
    }
  } catch {
    // Silently fail
  }
}
