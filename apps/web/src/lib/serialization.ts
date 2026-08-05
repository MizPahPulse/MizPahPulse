export function serializeBigInt(_key: string, value: unknown): unknown { return typeof value === 'bigint' ? value.toString() : value; }
export function safeJsonStringify(obj: unknown, space?: number): string { return JSON.stringify(obj, serializeBigInt, space); }
export function safeJsonParse<T>(json: string, fallback: T): T { try { return JSON.parse(json) as T; } catch { return fallback; } }
