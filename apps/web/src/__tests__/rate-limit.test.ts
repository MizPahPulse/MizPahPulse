import { describe, it, expect } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';

describe('rateLimit (in-memory fallback)', () => {
  it('allows requests up to the configured limit', async () => {
    const request = new Request('http://localhost/api/v1/test');
    for (let i = 0; i < 3; i++) {
      const result = await rateLimit(request, {
        maxRequests: 3,
        windowMs: 60_000,
        keyPrefix: 'rl-test-basic',
      });
      expect(result).toBeNull();
    }
  });

  it('returns a 429 with rate-limit headers once the limit is exceeded', async () => {
    const request = new Request('http://localhost/api/v1/test');
    for (let i = 0; i < 2; i++) {
      await rateLimit(request, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-test-limit' });
    }
    const limited = await rateLimit(request, {
      maxRequests: 2,
      windowMs: 60_000,
      keyPrefix: 'rl-test-limit',
    });

    expect(limited).not.toBeNull();
    expect(limited!.status).toBe(429);
    expect(limited!.headers.get('X-RateLimit-Limit')).toBe('2');
    expect(limited!.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(limited!.headers.get('Retry-After')).toBeTruthy();
  });

  it('uses separate buckets per IP', async () => {
    const reqA = new Request('http://localhost/api/v1/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    const reqB = new Request('http://localhost/api/v1/test', {
      headers: { 'x-forwarded-for': '5.6.7.8' },
    });

    for (let i = 0; i < 2; i++) {
      await rateLimit(reqA, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-test-ip' });
    }
    expect(
      await rateLimit(reqA, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-test-ip' }),
    ).not.toBeNull();
    expect(
      await rateLimit(reqB, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'rl-test-ip' }),
    ).toBeNull();
  });
});
