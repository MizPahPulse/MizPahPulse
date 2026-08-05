import { v4 as uuidv4 } from 'uuid';
import type { NextResponse } from 'next/server';

/**
 * Generate a unique request ID for tracing through the system.
 */
export function generateRequestId(): string {
  return `req_${uuidv4().slice(0, 8)}`;
}

/**
 * CORS headers to apply to API responses.
 * Uses the standard Next.js pattern for API route CORS.
 */
export function corsHeaders(origin = '*'): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Request-ID',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Handle CORS preflight (OPTIONS) requests.
 * Returns a 204 response with CORS headers, or null if not a preflight.
 */
export function handleCorsPreflight(request: Request): NextResponse | null {
  if (request.method !== 'OPTIONS') return null;

  // Dynamic import to avoid issues – use a simple inline response
  const { NextResponse } = require('next/server');
  const allowedOrigin =
    process.env.CORS_ORIGIN || request.headers.get('origin') || '*';
  const headers = corsHeaders(allowedOrigin);
  headers['Vary'] = 'Origin';

  return new NextResponse(null, { status: 204, headers });
}

/**
 * Structured request logger.
 * Logs method, path, status, duration, and request ID.
 */
export interface RequestLog {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userAgent?: string;
  ip?: string;
}

export function formatRequestLog(log: RequestLog): string {
  const parts = [
    `[${log.requestId}]`,
    log.method,
    log.path,
    `→ ${log.statusCode}`,
    `(${log.durationMs}ms)`,
  ];
  if (log.ip) parts.push(`[${log.ip}]`);
  return parts.join(' ');
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]!.trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

/**
 * Apply CORS headers to an existing response object.
 */
export function applyCorsHeaders(
  response: NextResponse,
  request: Request,
): NextResponse {
  const allowedOrigin =
    process.env.CORS_ORIGIN || request.headers.get('origin') || '*';

  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key, X-Request-ID',
  );
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Vary', 'Origin');

  return response;
}

/**
 * Wraps an API route handler with common middleware:
 * - CORS preflight handling
 * - Request ID generation
 * - Rate limiting is applied separately per-route
 */
export function withMiddleware(
  handler: (request: Request, requestId: string) => Promise<NextResponse>,
) {
  return async (request: Request): Promise<NextResponse> => {
    // Handle CORS preflight
    const preflight = handleCorsPreflight(request);
    if (preflight) return preflight;

    const requestId = request.headers.get('x-request-id') || generateRequestId();
    const start = Date.now();

    try {
      const response = await handler(request, requestId);

      // Add request ID header
      response.headers.set('X-Request-ID', requestId);

      // Apply CORS headers
      applyCorsHeaders(response, request);

      // Log request
      const duration = Date.now() - start;
      const log: RequestLog = {
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        statusCode: response.status,
        durationMs: duration,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') || undefined,
      };

      if (response.status >= 400) {
        console.error(formatRequestLog(log));
      } else if (process.env.NODE_ENV === 'development') {
        console.log(formatRequestLog(log));
      }

      return response;
    } catch (err) {
      const duration = Date.now() - start;
      const log: RequestLog = {
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        statusCode: 500,
        durationMs: duration,
        ip: getClientIp(request),
      };
      console.error(formatRequestLog(log), err);

      // Dynamic import to avoid top-level dependency issues
      const { errorResponse, ErrorCode } = await import('./api-errors');
      const response = errorResponse(
        ErrorCode.INTERNAL_ERROR,
        'An unexpected error occurred',
        undefined,
        requestId,
      );
      applyCorsHeaders(response, request);
      response.headers.set('X-Request-ID', requestId);
      return response;
    }
  };
}
