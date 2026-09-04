import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextResponse } from 'next/server';
import { withRequestId, REQUEST_ID_HEADER } from '@/lib/request-id';

/**
 * Unit tests for the request-ID correlation wrapper (issue #30):
 *  - every response carries an X-Request-ID header
 *  - error responses have requestId in the body
 *  - the handler sees the same id via the request headers
 *  - unhandled errors become 500s whose body/log line include the requestId
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe('withRequestId', () => {
  it('adds an X-Request-ID header to success responses', async () => {
    const handler = withRequestId(async () => NextResponse.json({ success: true, data: 1 }));

    const res = await handler(new Request('http://localhost/api/v1/test'), undefined);
    expect(res.status).toBe(200);
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy();
  });

  it('stamps the request header so handlers can log the same id', async () => {
    const spy = vi.fn(async (r: Request) =>
      NextResponse.json({ ok: true, seen: r.headers.get(REQUEST_ID_HEADER) }),
    );
    const handler = withRequestId(spy);

    const res = await handler(new Request('http://localhost/api/v1/test'), undefined);
    const body = await res.json();

    // The id the handler observed on its request equals the response header id.
    expect(body.seen).toBeTruthy();
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe(body.seen);
  });

  it('reuses an incoming X-Request-ID instead of generating a second one', async () => {
    const spy = vi.fn(async (r: Request) =>
      NextResponse.json({ ok: true, seen: r.headers.get(REQUEST_ID_HEADER) }),
    );
    const handler = withRequestId(spy);

    const res = await handler(
      new Request('http://localhost/api/v1/test', { headers: { [REQUEST_ID_HEADER]: 'req-123' } }),
      undefined,
    );
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe('req-123');
  });

  it('merges requestId into the body of error responses', async () => {
    const handler = withRequestId(async () =>
      NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'nope' } },
        { status: 404 },
      ),
    );

    const res = await handler(new Request('http://localhost/api/v1/test'), undefined);
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy();
    expect(body.error.requestId).toBeTruthy();
    expect(body.meta.requestId).toBeTruthy();
  });

  it('keeps an existing requestId in error bodies untouched', async () => {
    const handler = withRequestId(async () =>
      NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'bad', requestId: 'req-orig' } },
        { status: 400 },
      ),
    );

    const res = await handler(new Request('http://localhost/api/v1/test'), undefined);
    const body = await res.json();
    expect(body.error.requestId).toBe('req-orig');
  });

  it('turns unhandled errors into 500s carrying the requestId', async () => {
    const logger = await import('@/lib/logger');
    const errorSpy = vi.spyOn(logger.logger, 'error').mockImplementation(() => {});

    const handler = withRequestId(async () => {
      throw new Error('boom');
    });

    const res = await handler(new Request('http://localhost/api/v1/test'), undefined);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy();
    expect(body.error.requestId).toBe(res.headers.get(REQUEST_ID_HEADER));
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(res.headers.get(REQUEST_ID_HEADER) as string),
      expect.any(Error),
    );
  });
});
