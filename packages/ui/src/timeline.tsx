import React from 'react';
import { cn } from './cn';

export interface TimelineProps {
  events: Array<{
    id: string;
    icon: React.ReactNode;
    title: string;
    description?: string;
    timestamp: string;
    status?: 'success' | 'error' | 'warning' | 'info';
  }>;
  className?: string;
}

const statusDotColors = {
  success: 'bg-emerald-400 ring-emerald-100 dark:ring-emerald-900',
  error: 'bg-red-400 ring-red-100 dark:ring-red-900',
  warning: 'bg-amber-400 ring-amber-100 dark:ring-amber-900',
  info: 'bg-sky-400 ring-sky-100 dark:ring-sky-900',
};

export function Timeline({ events, className }: TimelineProps) {
  return (
    <div className={cn('relative', className)}>
      {events.map((event, idx) => (
        <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Vertical line */}
          {idx < events.length - 1 && (
            <div className="absolute left-[15px] top-10 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
          )}

          {/* Dot */}
          <div className="relative flex-shrink-0">
            <div
              className={cn(
                'h-8 w-8 rounded-full ring-4 flex items-center justify-center',
                statusDotColors[event.status || 'info'],
              )}
            >
              {event.icon}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {event.title}
              </p>
              <time className="flex-shrink-0 text-xs text-slate-500 dark:text-slate-400">
                {event.timestamp}
              </time>
            </div>
            {event.description && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
