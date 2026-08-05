import React from 'react';
import { cn } from './cn';

interface DividerProps {
  className?: string;
  label?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Divider({ className, label, orientation = 'horizontal' }: DividerProps) {
  if (label) {
    return (
      <div
        className={cn(
          'flex items-center gap-3',
          orientation === 'vertical' && 'flex-col',
          className,
        )}
      >
        <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
        <span className="text-xs text-slate-400 dark:text-slate-500">{label}</span>
        <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border-t border-slate-200 dark:border-slate-800',
        orientation === 'vertical' && 'border-t-0 border-l h-full',
        className,
      )}
    />
  );
}
