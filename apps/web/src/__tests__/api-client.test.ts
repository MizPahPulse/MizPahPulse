import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiFetch, ApiClientError } from '@/lib/api-client';

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('unwraps the success envelope into data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { totalEvents: 42 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const data = await apiFetch<{ totalEvents: number }>('/api/v1/stats');
    expect(data.totalEvents).toBe(42);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/stats',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('serializes JSON bodies and sets Content-Type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: '1' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/v1/webhooks', { method: 'POST', body: { endpoint: 'https://x.io' } });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ endpoint: 'https://x.io' }));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('throws ApiClientError with the server error code and message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(apiFetch('/api/v1/events')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      message: 'Rate limit exceeded',
    });
  });

  it('throws ApiClientError on non-JSON error responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })));

    await expect(apiFetch('/api/v1/events')).rejects.toBeInstanceOf(ApiClientError);
  });

  it('throws a TIMEOUT error when the request exceeds the timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            // Simulate an abort triggered by the timeout signal
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );

    const promise = apiFetch('/api/v1/events', { timeoutMs: 100 });
    // Attach the rejection handler first so the reject is never unhandled.
    const assertion = expect(promise).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(150);
    await assertion;
    vi.useRealTimers();
  });
});
