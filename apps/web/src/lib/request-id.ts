import { NextResponse } from 'next/server';
import { createRequestId, errorResponse, ErrorCode } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

export const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Wrap an API route handler so every response carries an `X-Request-ID`
 * header (issue #30). This lets a client error be correlated with server
 * logs end-to-end.
 *
 * The wrapper:
 *  - generates (or reuses) a `requestId` per request and stamps it on the
 *    request's own headers so downstream code — error bodies, `logger.error`
 *    calls — can reference the SAME id;
 *  - sets `X-Request-ID` on every response;
 *  - merges `requestId` into the body of error responses that don't already
 *    carry one;
 *  - converts unhandled exceptions into a 500 whose body and log line both
 *    include the `requestId`.
 */
export function withRequestId<Ctx = unknown>(
  handler: (request: Request, context: Ctx) => Promise<NextResponse> | NextResponse,
): (request: Request, context: Ctx) => Promise<NextResponse> {
  return async (request, context) => {
    const requestId = request.headers.get(REQUEST_ID_HEADER) ?? createRequestId();

    // Surface the id to the handler (for logs / error bodies) without mutating
    // the caller's request object.
    const enrichedRequest = request.headers.has(REQUEST_ID_HEADER)
      ? request
      : new Request(request, {
          headers: {
            ...Object.fromEntries(request.headers.entries()),
            [REQUEST_ID_HEADER]: requestId,
          },
        });

    try {
      const response = await handler(enrichedRequest, context as Ctx);
      response.headers.set(REQUEST_ID_HEADER, requestId);
      if (response.ok) return response;
      return mergeRequestIdIntoErrorBody(response, requestId);
    } catch (error) {
      logger.error(`[API] Unhandled error (requestId=${requestId}):`, error);
      const response = errorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Internal server error',
        undefined,
        requestId,
      );
      response.headers.set(REQUEST_ID_HEADER, requestId);
      return response;
    }
  };
}

/**
 * Error responses created before the handler knew its requestId (e.g.
 * validation failures inside the route) are re-issued with `requestId` added
 * to both `error` and `meta`. The body is always rebuilt after parsing so the
 * response stream is never consumed twice.
 */
async function mergeRequestIdIntoErrorBody(
  response: NextResponse,
  requestId: string,
): Promise<NextResponse> {
  try {
    const body = (await response.json()) as Record<string, unknown> | null;
    if (body && typeof body === 'object') {
      const error =
        body.error && typeof body.error === 'object'
          ? (body.error as Record<string, unknown>)
          : null;
      const meta =
        body.meta && typeof body.meta === 'object' ? (body.meta as Record<string, unknown>) : {};
      const hasErrorId = typeof error?.requestId === 'string';
      const hasMetaId = typeof meta.requestId === 'string';
      return NextResponse.json(
        {
          ...body,
          ...(error && !hasErrorId ? { error: { ...error, requestId } } : {}),
          ...(!hasMetaId ? { meta: { ...meta, requestId } } : {}),
        },
        { status: response.status, headers: response.headers },
      );
    }
  } catch {
    // Non-JSON error body (e.g. a streamed failure) — header only.
  }
  return response;
}
