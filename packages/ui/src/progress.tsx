import React from 'react';
import { cn } from './cn';

interface ProgressProps {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

const variantStyles = {
  default: 'bg-indigo-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
};

const sizeStyles = { sm: 'h-1', md: 'h-2', lg: 'h-3' };

export function Progress({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  className,
  showLabel,
}: ProgressProps) {
  const percent = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden', sizeStyles[size])}>
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          className={cn('h-full rounded-full transition-all duration-500 ease-out', variantStyles[variant])}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-right">
          {Math.round(percent)}%
        </p>
      )}
    </div>
  );
}
