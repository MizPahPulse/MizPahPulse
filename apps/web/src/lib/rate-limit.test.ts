import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rateLimit } from './rate-limit';

function request(ip: string, path = '/api/v1/events'): Request {
  return new Request(`http://localhost${path}`, {
    headers: { 'x-forwarded-for': ip },
  });
}

describe('rateLimit in-memory fallback', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-08T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', async () => {
    const req = request('1.1.1.1');
    for (let i = 0; i < 3; i++) {
      expect(
        await rateLimit(req, { maxRequests: 3, windowMs: 60_000, keyPrefix: 'api' }),
      ).toBeNull();
    }
  });

  it('returns 429 over the limit', async () => {
    const req = request('2.2.2.2');
    for (let i = 0; i < 3; i++) {
      await rateLimit(req, { maxRequests: 3, windowMs: 60_000, keyPrefix: 'api' });
    }
    const res = await rateLimit(req, {
      maxRequests: 3,
      windowMs: 60_000,
      keyPrefix: 'api',
    });
    expect(res?.status).toBe(429);
    expect(res?.headers.get('X-RateLimit-Limit')).toBe('3');
  });

  it('resets after the window', async () => {
    const req = request('3.3.3.3');
    for (let i = 0; i < 3; i++) {
      await rateLimit(req, { maxRequests: 3, windowMs: 60_000, keyPrefix: 'api' });
    }
    await vi.advanceTimersByTimeAsync(60_001);
    expect(await rateLimit(req, { maxRequests: 3, windowMs: 60_000, keyPrefix: 'api' })).toBeNull();
  });

  it('keeps key prefixes isolated', async () => {
    const req = request('4.4.4.4');
    for (let i = 0; i < 3; i++) {
      await rateLimit(req, { maxRequests: 3, windowMs: 60_000, keyPrefix: 'api' });
    }
    expect(
      await rateLimit(req, { maxRequests: 3, windowMs: 60_000, keyPrefix: 'auth' }),
    ).toBeNull();
  });
});
