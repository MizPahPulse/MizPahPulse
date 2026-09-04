import { errorResponse, ErrorCode } from './api-errors';
import type { NextResponse } from 'next/server';
import type Redis from 'ioredis';

/**
 * Rate limiting backed by Redis (when available) with an in-memory fallback.
 *
 * Why Redis: the old implementation lived in a module-level Map, so every
 * serverless instance and every restart reset the counters — making limits
 * trivially bypassable. When REDIS_URL is configured the counters are shared
 * and durable across instances. If Redis is down we fail *open* to the
 * in-memory store rather than rejecting legitimate traffic.
 */

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

// ──────────────────────────────────────────────
// Redis backend (lazy, fail-open)
// ──────────────────────────────────────────────
let redisClient: Redis | null = null;
let lastRedisFailure = 0;
const REDIS_RETRY_COOLDOWN = 30_000; // Wait 30s before retrying a failed connection

async function getRedis(): Promise<Redis | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (redisClient) return redisClient;
  if (Date.now() - lastRedisFailure < REDIS_RETRY_COOLDOWN) return null;

  const { default: RedisModule } = await import('ioredis');
  try {
    const client = new RedisModule(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2_000,
    });
    client.on('error', () => {
      // Mark Redis unhealthy so subsequent calls fall back to memory.
      lastRedisFailure = Date.now();
    });
    await client.ping();
    redisClient = client;
    return client;
  } catch {
    lastRedisFailure = Date.now();
    return null;
  }
}

interface LimitCheck {
  limited: boolean;
  count: number;
  resetAt: number;
}

/**
 * Fixed-window counter keyed by `ratelimit:<identifier>:<bucket>`.
 * Buckets are aligned to the window so reset times are predictable.
 */
async function checkRedisLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): Promise<LimitCheck> {
  const client = await getRedis();
  if (!client) {
    // Redis unavailable — fall back to the in-memory store.
    return checkMemoryLimit(identifier, maxRequests, windowMs);
  }

  try {
    const now = Date.now();
    const bucket = Math.floor(now / windowMs) * windowMs;
    const key = `ratelimit:${identifier}:${bucket}`;
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, Math.max(1, Math.ceil(windowMs / 1000)));
    }
    return {
      limited: count > maxRequests,
      count,
      resetAt: bucket + windowMs,
    };
  } catch {
    lastRedisFailure = Date.now();
    return checkMemoryLimit(identifier, maxRequests, windowMs);
  }
}

function checkMemoryLimit(identifier: string, maxRequests: number, windowMs: number): LimitCheck {
  startCleanup();

  const now = Date.now();
  const existing = store.get(identifier);

  if (!existing || now > existing.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { limited: false, count: 1, resetAt: now + windowMs };
  }

  existing.count++;
  return {
    limited: existing.count > maxRequests,
    count: existing.count,
    resetAt: existing.resetAt,
  };
}

function resolveIdentifier(request: Request, keyPrefix: string): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
  const url = new URL(request.url);
  return `${keyPrefix}:${ip}:${url.pathname}`;
}

export interface RateLimitResult {
  /** Whether this request exceeds the configured limit. */
  limited: boolean;
  /**
   * Standard rate-limit headers describing THIS request's consumption:
   * `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.
   * Routes attach them to every response (success and 429 alike) so clients
   * can observe remaining capacity and back off gracefully (issue #29).
   */
  headers: Record<string, string>;
  /** The 429 error response when `limited` is true, otherwise null. */
  response: NextResponse | null;
}

function buildRateLimitHeaders(
  maxRequests: number,
  count: number,
  resetAt: number,
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(maxRequests),
    'X-RateLimit-Remaining': String(Math.max(0, maxRequests - count)),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
  };
}

/**
 * Sliding-window rate limiter (Redis-backed with in-memory fallback).
 *
 * Returns the limit decision plus the standard `X-RateLimit-*` headers for the
 * current request. `response` carries the 429 when `limited` is true; routes
 * attach `headers` to their success responses so the headers are present on
 * every response (issue #29).
 */
export async function rateLimit(
  request: Request,
  options: RateLimitOptions = {},
): Promise<RateLimitResult> {
  const { maxRequests = 100, windowMs = 60_000, keyPrefix = 'global' } = options;

  const identifier = resolveIdentifier(request, keyPrefix);
  const { limited, count, resetAt } = await checkRedisLimit(identifier, maxRequests, windowMs);
  const headers = buildRateLimitHeaders(maxRequests, count, resetAt);

  if (limited) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return {
      limited: true,
      headers,
      response: errorResponse(
        ErrorCode.RATE_LIMITED,
        `Rate limit exceeded. Try again in ${retryAfter}s.`,
        {
          maxRequests,
          windowMs,
          retryAfterSeconds: retryAfter,
        },
        undefined,
        {
          ...headers,
          'Retry-After': String(Math.max(1, retryAfter)),
        },
      ),
    };
  }

  return { limited: false, headers, response: null };
}

/**
 * Get remaining rate limit for diagnostics.
 */
export async function getRateLimitInfo(request: Request, options: RateLimitOptions = {}) {
  const { maxRequests = 100, windowMs = 60_000, keyPrefix = 'global' } = options;
  const identifier = resolveIdentifier(request, keyPrefix);

  const client = await getRedis();
  if (client) {
    try {
      const now = Date.now();
      const bucket = Math.floor(now / windowMs) * windowMs;
      const key = `ratelimit:${identifier}:${bucket}`;
      const count = await client.get(key);
      return {
        remaining: Math.max(0, maxRequests - (count ? parseInt(count, 10) : 0)),
        resetAt: bucket + windowMs,
      };
    } catch {
      lastRedisFailure = Date.now();
    }
  }

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
