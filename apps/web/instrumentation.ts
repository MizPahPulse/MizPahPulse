/**
 * Next.js server instrumentation (issue #76).
 *
 * Runs once when the Node.js server process starts. Initializes Sentry so
 * unhandled exceptions / rejections and `logger.error(...)` calls from API
 * routes are reported. No-op when `SENTRY_DSN` is unset.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSentry, installProcessHandlers } = await import('@/lib/sentry');
    initSentry();
    installProcessHandlers();
  }
}
