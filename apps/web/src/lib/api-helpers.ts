export function buildQueryString(params: Record<string, string | string[] | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    if (Array.isArray(value)) value.forEach(v => sp.append(key, v));
    else sp.set(key, value);
  }
  const qs = sp.toString();
  return qs ? '?' + qs : '';
}

export function parseJsonSafe<T>(json: string, fallback: T): T {
  try { return JSON.parse(json); } catch { return fallback; }
}

export function createApiUrl(path: string, params?: Record<string, string | string[]>): string {
  return path + (params ? buildQueryString(params) : '');
}
