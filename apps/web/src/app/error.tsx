'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { formatError } from '@/lib/error-handler';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('[ErrorPage] Unhandled error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <p className="text-8xl font-extrabold text-red-500">500</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
          Something went wrong
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          {formatError(error).message}. Please try again.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs font-mono text-slate-400 dark:text-slate-500">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-8">
          <button
            onClick={reset}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    </main>
  );
}
