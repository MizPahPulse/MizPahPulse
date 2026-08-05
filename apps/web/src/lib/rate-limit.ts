import { errorResponse, ErrorCode } from './api-errors';
import type { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodically clean up expired entries
const CLEANUP_INTERVAL = 60_000; // 1 minute
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
    if (store.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL);
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window */
  maxRequests?: number;
  /** Window size in milliseconds */
  windowMs?: number;
  /** Key prefix for the rate limit store (e.g., 'api', 'auth') */
  keyPrefix?: string;
}

/**
 * Simple sliding-window rate limiter.
 * Returns null if the request is allowed, or a 429 error response if rate limited.
 */
export async function rateLimit(
  request: Request,
  options: RateLimitOptions = {},
): Promise<NextResponse | null> {
  const { maxRequests = 100, windowMs = 60_000, keyPrefix = 'global' } = options;

  // Use IP + route as identifier
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
  const url = new URL(request.url);
  const identifier = `${keyPrefix}:${ip}:${url.pathname}`;

  startCleanup();

  const now = Date.now();
  const existing = store.get(identifier);

  if (!existing || now > existing.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return null;
  }

  existing.count++;

  if (existing.count > maxRequests) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return errorResponse(
      ErrorCode.RATE_LIMITED,
      `Rate limit exceeded. Try again in ${retryAfter}s.`,
      {
        maxRequests,
        windowMs,
        retryAfterSeconds: retryAfter,
      },
    );
  }

  return null;
}

/**
 * Get remaining rate limit for diagnostics.
 */
export function getRateLimitInfo(request: Request, options: RateLimitOptions = {}) {
  const { maxRequests = 100, windowMs = 60_000, keyPrefix = 'global' } = options;
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
  const url = new URL(request.url);
  const identifier = `${keyPrefix}:${ip}:${url.pathname}`;

  const entry = store.get(identifier);
  const now = Date.now();

  if (!entry || now > entry.resetAt) {
    return { remaining: maxRequests, resetAt: now + windowMs };
  }

  return {
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}
