export function joinPaths(...parts: string[]): string { return parts.map(p => p.replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/'); }
export function getBasePath(): string { return process.env.NEXT_PUBLIC_BASE_PATH || ''; }
export function getApiPath(endpoint: string): string { return joinPaths('/api/v1', endpoint); }
export function isExternalUrl(url: string): boolean { return /^https?:\/\//.test(url); }
