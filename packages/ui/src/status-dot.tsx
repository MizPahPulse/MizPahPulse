import React from 'react';
import { cn } from './cn';

export type StatusType = 'online' | 'offline' | 'syncing' | 'error' | 'warning';

export interface StatusDotProps {
  status: StatusType;
  className?: string;
  pulse?: boolean;
  label?: string;
}

const statusStyles: Record<StatusType, { dot: string; pulse: string; label: string }> = {
  online: {
    dot: 'bg-emerald-500',
    pulse: 'bg-emerald-400',
    label: 'text-emerald-600 dark:text-emerald-400',
  },
  offline: {
    dot: 'bg-slate-400',
    pulse: 'bg-slate-300',
    label: 'text-slate-500 dark:text-slate-400',
  },
  syncing: {
    dot: 'bg-amber-500',
    pulse: 'bg-amber-400',
    label: 'text-amber-600 dark:text-amber-400',
  },
  error: {
    dot: 'bg-red-500',
    pulse: 'bg-red-400',
    label: 'text-red-600 dark:text-red-400',
  },
  warning: {
    dot: 'bg-orange-500',
    pulse: 'bg-orange-400',
    label: 'text-orange-600 dark:text-orange-400',
  },
};

export function StatusDot({ status, className, pulse = true, label }: StatusDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full',
            statusStyles[status].dot,
          )}
        />
        {pulse && (status === 'online' || status === 'syncing') && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              statusStyles[status].pulse,
            )}
          />
        )}
      </span>
      {label && (
        <span className={cn('text-xs font-medium capitalize', statusStyles[status].label)}>
          {label}
        </span>
      )}
    </span>
  );
}
