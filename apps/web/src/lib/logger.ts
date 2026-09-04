const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

/**
 * Optional error reporter (e.g. Sentry), registered server-side by
 * `@/lib/sentry`. Kept out of the logger's own import graph so client
 * components that import `logger` never pull in Node-only dependencies.
 */
type ErrorReporter = (error: unknown, context?: Record<string, unknown>) => void;
let errorReporter: ErrorReporter | undefined;

/** Register a callback invoked for every `logger.error(...)` call. */
export function setErrorReporter(reporter: ErrorReporter | undefined): void {
  errorReporter = reporter;
}

function log(level: LogLevel, msg: string, ...args: unknown[]) {
  if (LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]) {
    const ts = new Date().toISOString();
    const prefix = `[${ts}] [${level.toUpperCase()}]`;
    if (level === 'error') console.error(prefix, msg, ...args);
    else if (level === 'warn') console.warn(prefix, msg, ...args);
    else console.log(prefix, msg, ...args);

    // Forward errors to the registered reporter (Sentry) when available.
    if (level === 'error' && errorReporter) {
      const first = args[0];
      if (first instanceof Error) {
        errorReporter(first);
      } else if (first !== undefined) {
        errorReporter(new Error(msg), { detail: first });
      } else {
        errorReporter(new Error(msg));
      }
    }
  }
}

export const logger = {
  debug: (m: string, ...a: unknown[]) => log('debug', m, ...a),
  info: (m: string, ...a: unknown[]) => log('info', m, ...a),
  warn: (m: string, ...a: unknown[]) => log('warn', m, ...a),
  error: (m: string, ...a: unknown[]) => log('error', m, ...a),
};
