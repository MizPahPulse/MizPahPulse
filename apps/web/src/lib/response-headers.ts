import type { NextResponse } from 'next/server';
import { getRateLimitInfo } from './rate-limit';

/**
 * Add standard API response headers to a NextResponse.
 */
export function addStandardHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Response-Time', `${Date.now()}ms`);
}

/**
 * Add rate limit info headers based on current usage.
 */
export function addRateLimitHeaders(
  response: NextResponse,
  request: Request,
  options: { maxRequests?: number; windowMs?: number; keyPrefix?: string } = {},
): void {
  const info = getRateLimitInfo(request, options);
  response.headers.set('X-RateLimit-Remaining', String(info.remaining));
  response.headers.set(
    'X-RateLimit-Reset',
    new Date(info.resetAt).toISOString(),
  );
  response.headers.set(
    'X-RateLimit-Limit',
    String(options.maxRequests ?? 100),
  );
}

/**
 * Add cache control headers for static/rarely-changing data.
 */
export function addCacheHeaders(
  response: NextResponse,
  maxAge = 30,
  staleWhileRevalidate = 60,
): void {
  response.headers.set(
    'Cache-Control',
    `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  );
}

/**
 * Add no-cache headers for sensitive or real-time data.
 */
export function addNoCacheHeaders(response: NextResponse): void {
  response.headers.set(
    'Cache-Control',
    'no-cache, no-store, must-revalidate, private',
  );
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
}
