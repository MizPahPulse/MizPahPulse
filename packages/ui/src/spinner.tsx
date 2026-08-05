import React from 'react';
import { cn } from './cn';

export function Spinner({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeStyles = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-slate-200 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-400',
        sizeStyles[size],
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
