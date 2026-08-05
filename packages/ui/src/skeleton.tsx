import React from 'react';
import { cn } from './cn';

export interface SkeletonProps {
  className?: string;
  /** Variant shapes for different content types */
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'list-item';
}

const baseClasses = 'animate-pulse bg-slate-200 dark:bg-slate-800';

const variantClasses: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: 'h-4 w-full rounded',
  circular: 'rounded-full',
  rectangular: 'rounded-lg',
  card: 'h-32 w-full rounded-xl',
  'list-item': 'h-16 w-full rounded-lg',
};

export function Skeleton({ className, variant = 'text' }: SkeletonProps) {
  return <div className={cn(baseClasses, variantClasses[variant], className)} />;
}

/** Pre-built skeleton for an event feed item */
export function FeedItemSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <Skeleton variant="circular" className="h-3 w-3" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

/** Pre-built dashboard stat card skeleton */
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton variant="rectangular" className="h-10 w-10" />
      </div>
    </div>
  );
}

/** Pre-built table row skeleton */
export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === 0 ? 'flex-1' : 'w-24')} />
      ))}
    </div>
  );
}
