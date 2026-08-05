export function getQueryParam(key: string): string | null { return new URLSearchParams(window.location.search).get(key); }
export function setQueryParam(key: string, value: string): void { const sp = new URLSearchParams(window.location.search); sp.set(key, value); window.history.replaceState(null, '', '?' + sp.toString()); }
export function getAllQueryParams(): Record<string, string> { return Object.fromEntries(new URLSearchParams(window.location.search)); }
