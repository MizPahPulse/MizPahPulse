export class AssertionError extends Error {
  constructor(message: string) { super(message); this.name = 'AssertionError'; }
}

export function assert(condition: unknown, message = 'Assertion failed'): asserts condition {
  if (!condition) throw new AssertionError(message);
}

export function assertDefined<T>(value: T | undefined | null, message = 'Value must be defined'): T {
  if (value == null) throw new AssertionError(message);
  return value;
}

export function assertType<T>(value: unknown, expectedType: string, message?: string): asserts value is T {
  if (typeof value !== expectedType) {
    throw new AssertionError(message || `Expected ${expectedType}, got ${typeof value}`);
  }
}
