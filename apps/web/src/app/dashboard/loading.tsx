import { StatCardSkeleton, FeedItemSkeleton } from '@mizpah-pulse/ui';

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-1 h-4 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="h-6 w-6 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-3 h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-1 h-3 w-32 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>

      {/* Feed items */}
      <div>
        <div className="mb-4 h-6 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <FeedItemSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
