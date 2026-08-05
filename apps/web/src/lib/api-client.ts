/**
 * Typed client for the MizPahPulse internal REST API.
 *
 * Centralizes fetch/JSON handling so pages don't hand-roll the same
 * error-prone boilerplate: timeouts, abort propagation, and consistent
 * error shapes. All internal endpoints wrap responses in `{ success, data }`,
 * so a successful call resolves to the unwrapped `data` payload.
 */

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface ApiFetchOptions {
  /** Request method (defaults to GET) */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON-serializable request body */
  body?: unknown;
  /** Extra headers to merge (Content-Type is set automatically) */
  headers?: Record<string, string>;
  /** Abort signal from the caller (e.g. React effect cleanup) */
  signal?: AbortSignal;
  /** Timeout in milliseconds (default 15s) */
  timeoutMs?: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
}

/**
 * Fetch a JSON endpoint and unwrap the standard API envelope.
 *
 * @throws ApiClientError with a stable `code` for network, timeout, and API errors.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, headers, signal, timeoutMs = 15_000 } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Combine the caller's signal with the timeout signal when provided.
  const combinedSignal =
    signal && typeof AbortSignal.any === 'function'
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

  try {
    const response = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: combinedSignal,
    });

    let json: ApiEnvelope<T> | null = null;
    try {
      json = (await response.json()) as ApiEnvelope<T>;
    } catch {
      // Non-JSON response (e.g. proxy error page) — fall through to status handling.
    }

    if (!response.ok) {
      throw new ApiClientError(
        json?.error?.message ?? `Request failed with status ${response.status}`,
        json?.error?.code ?? 'INTERNAL_ERROR',
        response.status,
        json?.error?.details,
      );
    }

    // Unwrap the envelope: `{ success: true, data }` → `data`.
    return (json && json.success ? json.data : json) as T;
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiClientError('Request timed out', 'TIMEOUT', 408);
    }
    throw new ApiClientError(
      err instanceof Error ? err.message : 'Network request failed',
      'NETWORK_ERROR',
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}
