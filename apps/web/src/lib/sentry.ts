/**
 * Sentry error tracking integration (issue #76).
 *
 * Server-only module — never import this from client components.
 *
 * Behavior:
 *  - Enabled only when `SENTRY_DSN` is set (disabled otherwise, so local
 *    development and environments without a DSN stay unaffected).
 *  - Release is tagged from the git SHA: `GIT_SHA` env var first, falling
 *    back to `VERCEL_GIT_COMMIT_SHA`, then a runtime `git rev-parse HEAD`.
 *  - Wired into the existing `logger` abstraction via `setErrorReporter`,
 *    so every `logger.error(...)` call is also reported to Sentry.
 */
import {
  init,
  captureException,
  captureMessage as sentryCaptureMessage,
  getClient,
  setContext,
} from '@sentry/node';
import { execFileSync } from 'child_process';
import { setErrorReporter } from './logger';

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

/**
 * Initialize Sentry. Safe to call multiple times (idempotent) and safe to
 * call when no DSN is configured — it simply no-ops.
 */
export function initSentry(): void {
  if (enabled) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: resolveRelease(),
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Never send the raw API keys / secrets that may be present in request data.
    sendDefaultPii: false,
  });

  enabled = true;
  // Route the existing `logger.error(...)` calls into Sentry.
  setErrorReporter((error, context) => {
    if (!enabled) return;
    if (context) setContext('request', context);
    captureException(error);
  });
  console.log(
    '[Sentry] Error tracking enabled',
    process.env.GIT_SHA ? '(release from GIT_SHA)' : '',
  );
}

/**
 * Report an error to Sentry. No-op when disabled.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  if (context) setContext('context', context);
  captureException(error);
}

/**
 * Report a non-fatal message/event. No-op when disabled.
 */
export function captureMessage(message: string, context?: Record<string, unknown>): void {
  if (!enabled) return;
  if (context) setContext('context', context);
  sentryCaptureMessage(message);
}

/**
 * Capture unhandled exceptions and unhandled promise rejections so crashes
 * are visible in Sentry. Deliberately does not change process exit semantics
 * — Node still crashes as it would without the handler.
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

/**
 * True when a DSN is configured and Sentry is live. Useful for conditional
 * behavior (e.g. skipping Sentry-only work in tests).
 */
export function isSentryEnabled(): boolean {
  return enabled || Boolean(getClient());
}
