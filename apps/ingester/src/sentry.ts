/**
 * Sentry error tracking integration (issue #76) for the ingester.
 *
 * Behavior:
 *  - Enabled only when `SENTRY_DSN` is set (disabled otherwise).
 *  - Release is tagged from the git SHA: `GIT_SHA` env var first, falling
 *    back to `VERCEL_GIT_COMMIT_SHA`, then a runtime `git rev-parse HEAD`.
 *  - Captures unhandled exceptions / promise rejections without changing
 *    process exit semantics.
 */
import { init, captureException, captureMessage as sentryCaptureMessage } from '@sentry/node';
import { execFileSync } from 'child_process';

let enabled = false;

function resolveRelease(): string | undefined {
  const fromEnv =
    process.env.GIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RENDER_GIT_COMMIT;
  if (fromEnv) return fromEnv;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Initialize Sentry. Idempotent; no-ops when `SENTRY_DSN` is unset. */
export function initSentry(): void {
  if (enabled) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: resolveRelease(),
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,
  });
  enabled = true;
  console.log('[Sentry] Error tracking enabled (ingester)');
}

/** Report an error to Sentry. No-op when disabled. */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  captureException(error, context ? { extra: context } : undefined);
}

/** Report a non-fatal message. No-op when disabled. */
export function captureMessage(message: string, context?: Record<string, unknown>): void {
  if (!enabled) return;
  sentryCaptureMessage(message, context ? { extra: context } : undefined);
}

/**
 * Capture unhandled exceptions and rejections. Does not alter exit behavior.
 */
export function installProcessHandlers(): void {
  if (!enabled) return;
  process.on('uncaughtException', (error) => {
    captureError(error);
  });
  process.on('unhandledRejection', (reason) => {
    captureError(reason instanceof Error ? reason : new Error(String(reason)));
  });
}
