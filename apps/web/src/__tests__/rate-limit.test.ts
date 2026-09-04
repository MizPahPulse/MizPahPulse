import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimit, getRateLimitInfo } from '@/lib/rate-limit';

/**
 * Unit tests for the rate-limit utility (issue #82).
 *
 * The in-memory fallback store is module-scoped, so every test uses a unique
 * `keyPrefix` to stay fully isolated and deterministic.
 */

// Shared mutable state for the mocked `ioredis` module. The module itself is
// imported lazily by rate-limit.ts, so the factory below intercepts that
// dynamic import.
const redisMock = vi.hoisted(() => ({
  counts: new Map<string, number>(),
  failNextPing: false,
}));

vi.mock('ioredis', () => {
  return {
    default: class RedisMock {
      on() {
        return this;
      }
      async ping() {
        if (redisMock.failNextPing) {
          redisMock.failNextPing = false;
          throw new Error('ECONNREFUSED');
        }
        return 'PONG';
      }
      async incr(key: string) {
        const next = (redisMock.counts.get(key) ?? 0) + 1;
        redisMock.counts.set(key, next);
        return next;
      }
      async expire() {
        return 1;
      }
      async get(key: string) {
        const value = redisMock.counts.get(key);
        return value === undefined ? null : String(value);
      }
    },
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('rateLimit — in-memory fallback', () => {
  it('allows requests up to the configured limit and returns rate-limit headers', async () => {
    const request = new Request('http://localhost/api/v1/test');
    for (let i = 0; i < 3; i++) {
      const result = await rateLimit(request, {
        maxRequests: 3,
        windowMs: 60_000,
        keyPrefix: 'rl-mem-allow',
      });
      expect(result.limited).toBe(false);
      expect(result.response).toBeNull();
      expect(result.headers['X-RateLimit-Limit']).toBe('3');
      // Remaining decrements per request: 3 → 2 → 1.
      expect(result.headers['X-RateLimit-Remaining']).toBe(String(3 - i - 1));
      expect(result.headers['X-RateLimit-Reset']).toBeTruthy();
    }
  });

  it('returns a 429 with rate-limit headers once the limit is exceeded', async () => {
    const request = new Request('http://localhost/api/v1/test');
    for (let i = 0; i < 2; i++) {
      await rateLimit(request, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-mem-429' });
    }
    const limited = await rateLimit(request, {
      maxRequests: 2,
      windowMs: 60_000,
      keyPrefix: 'rl-mem-429',
    });

    expect(limited.limited).toBe(true);
    expect(limited.response).not.toBeNull();
    expect(limited.response!.status).toBe(429);
    expect(limited.headers['X-RateLimit-Limit']).toBe('2');
    expect(limited.headers['X-RateLimit-Remaining']).toBe('0');
    expect(limited.response!.headers.get('X-RateLimit-Limit')).toBe('2');
    expect(limited.response!.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(limited.response!.headers.get('Retry-After')).toBeTruthy();
  });

  it('uses separate buckets per IP', async () => {
    const reqA = new Request('http://localhost/api/v1/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    const reqB = new Request('http://localhost/api/v1/test', {
      headers: { 'x-forwarded-for': '5.6.7.8' },
    });

    for (let i = 0; i < 2; i++) {
      await rateLimit(reqA, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-mem-ip' });
    }
    expect(
      await rateLimit(reqA, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-mem-ip' }),
    ).toMatchObject({ limited: true });
    expect(
      await rateLimit(reqB, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-mem-ip' }),
    ).toMatchObject({ limited: false });
  });

  it('isolates counters across different key prefixes for the same IP', async () => {
    const request = new Request('http://localhost/api/v1/test', {
      headers: { 'x-forwarded-for': '9.9.9.9' },
    });

    for (let i = 0; i < 2; i++) {
      await rateLimit(request, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-prefix-a' });
    }
    // The same IP is exhausted under prefix A…
    expect(
      await rateLimit(request, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-prefix-a' }),
    ).toMatchObject({ limited: true });
    // …but unaffected under prefix B.
    expect(
      await rateLimit(request, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-prefix-b' }),
    ).toMatchObject({ limited: false });
  });

  it('resets the counter once the window has elapsed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const request = new Request('http://localhost/api/v1/test');

    for (let i = 0; i < 2; i++) {
      await rateLimit(request, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-window' });
    }
    expect(
      await rateLimit(request, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-window' }),
    ).toMatchObject({ limited: true });

    // After the window elapses the bucket starts fresh again.
    vi.advanceTimersByTime(61_000);
    expect(
      await rateLimit(request, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-window' }),
    ).toMatchObject({ limited: false });
  });
});

describe('getRateLimitInfo — in-memory fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('reports the full allowance when nothing has been consumed', async () => {
    const request = new Request('http://localhost/api/v1/test');
    const info = await getRateLimitInfo(request, {
      maxRequests: 100,
      windowMs: 60_000,
      keyPrefix: 'rl-info-fresh',
    });
    expect(info.remaining).toBe(100);
    expect(info.resetAt).toBeGreaterThan(Date.now());
  });

  it('counts down consumed requests against the remaining allowance', async () => {
    const request = new Request('http://localhost/api/v1/test');
    for (let i = 0; i < 3; i++) {
      await rateLimit(request, { maxRequests: 10, windowMs: 60_000, keyPrefix: 'rl-info-used' });
    }
    const info = await getRateLimitInfo(request, {
      maxRequests: 10,
      windowMs: 60_000,
      keyPrefix: 'rl-info-used',
    });
    expect(info.remaining).toBe(7);
  });

  it('reports zero remaining once the limit is exhausted', async () => {
    const request = new Request('http://localhost/api/v1/test');
    for (let i = 0; i < 5; i++) {
      await rateLimit(request, { maxRequests: 5, windowMs: 60_000, keyPrefix: 'rl-info-exh' });
    }
    const info = await getRateLimitInfo(request, {
      maxRequests: 5,
      windowMs: 60_000,
      keyPrefix: 'rl-info-exh',
    });
    expect(info.remaining).toBe(0);
  });
});

describe('rateLimit — Redis backend', () => {
  beforeEach(() => {
    redisMock.counts.clear();
    vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
  });

  it('enforces the limit through the shared Redis store', async () => {
    const request = new Request('http://localhost/api/v1/test', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    for (let i = 0; i < 2; i++) {
      await rateLimit(request, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-redis-429' });
    }
    const limited = await rateLimit(request, {
      maxRequests: 2,
      windowMs: 60_000,
      keyPrefix: 'rl-redis-429',
    });
    expect(limited.limited).toBe(true);
    expect(limited.response!.status).toBe(429);
    expect(limited.response!.headers.get('X-RateLimit-Limit')).toBe('2');
    expect(limited.headers['X-RateLimit-Limit']).toBe('2');
  });

  it('reports remaining allowance from the Redis store', async () => {
    const request = new Request('http://localhost/api/v1/test', {
      headers: { 'x-forwarded-for': '10.0.0.2' },
    });
    await rateLimit(request, { maxRequests: 5, windowMs: 60_000, keyPrefix: 'rl-redis-info' });

    const info = await getRateLimitInfo(request, {
      maxRequests: 5,
      windowMs: 60_000,
      keyPrefix: 'rl-redis-info',
    });
    expect(info.remaining).toBe(4);
  });

  it('fails open to the in-memory store when Redis is unavailable', async () => {
    // Reset module state so the (previously cached) Redis client is discarded.
    vi.resetModules();
    redisMock.failNextPing = true;
    const { rateLimit: freshRateLimit } = await import('@/lib/rate-limit');

    const request = new Request('http://localhost/api/v1/test', {
      headers: { 'x-forwarded-for': '10.0.0.3' },
    });
    await freshRateLimit(request, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-redis-down' });
    await freshRateLimit(request, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-redis-down' });
    const limited = await freshRateLimit(request, {
      maxRequests: 2,
      windowMs: 60_000,
      keyPrefix: 'rl-redis-down',
    });

    // Rate limiting still works via the in-memory fallback.
    expect(limited.limited).toBe(true);
    expect(limited.response!.status).toBe(429);
  });
});
