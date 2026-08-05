export function isString(value: unknown): value is string { return typeof value === 'string'; }
export function isNumber(value: unknown): value is number { return typeof value === 'number' && !isNaN(value); }
export function isBoolean(value: unknown): value is boolean { return typeof value === 'boolean'; }
export function isObject(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export function isArrayOf<T>(value: unknown, check: (item: unknown) => item is T): value is T[] { return Array.isArray(value) && value.every(check); }
export function isNonEmptyString(value: unknown): value is string { return isString(value) && value.length > 0; }
