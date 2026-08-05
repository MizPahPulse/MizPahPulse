/**
 * Type-safe fetch wrapper for MizPahPulse API calls.
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { timestamp: string; version: string };
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  const json = await res.json();

  if (!res.ok && !json.success) {
    return { success: false, error: json.error };
  }

  return json as ApiResponse<T>;
}

export async function apiGet<T>(path: string, params?: Record<string, string>) {
  const searchParams = params
    ? '?' + new URLSearchParams(params).toString()
    : '';
  return apiFetch<T>(path + searchParams);
}

export async function apiPost<T>(path: string, body: unknown) {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getApiUrl(): string {
  if (typeof window !== 'undefined') return '';
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
}
