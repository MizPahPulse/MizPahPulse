import React from 'react';
import { cn } from './cn';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface FilterBarProps {
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label?: string;
  className?: string;
  multiSelect?: boolean;
}

export function FilterBar({
  options,
  selected,
  onChange,
  label = 'Filter',
  className,
  multiSelect = true,
}: FilterBarProps) {
  const toggle = (value: string) => {
    if (multiSelect) {
      if (selected.includes(value)) {
        onChange(selected.filter((v) => v !== value));
      } else {
        onChange([...selected, value]);
      }
    } else {
      onChange(selected.includes(value) ? [] : [value]);
    }
  };

  const clearAll = () => onChange([]);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}:</span>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => toggle(option.value)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
            'border',
            selected.includes(option.value)
              ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-700'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800',
          )}
        >
          {option.label}
          {option.count !== undefined && (
            <span
              className={cn(
                'ml-0.5 rounded-full px-1 py-0.5 text-[10px]',
                selected.includes(option.value)
                  ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-800 dark:text-indigo-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
              )}
            >
              {option.count}
            </span>
          )}
        </button>
      ))}
      {selected.length > 0 && (
        <button
          onClick={clearAll}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
