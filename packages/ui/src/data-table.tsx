'use client';

import React, { useMemo, useState } from 'react';
import { cn } from './cn';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

export interface DataTableColumn<T> {
  /** Column header text */
  header: string;
  /** Render the cell content for a row */
  cell: (row: T) => React.ReactNode;
  /**
   * Extract a comparable value (string | number) from a row. When provided,
   * the column header becomes a sort toggle.
   */
  sortValue?: (row: T) => string | number;
  /** Extra classes for this column's cells */
  className?: string;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  /** Stable key per row (e.g. an id). */
  rowKey: (row: T) => string;
  /** Accessible table caption (visually hidden — the data is self-evident). */
  caption?: string;
  /** Column index to sort by initially. */
  defaultSortIndex?: number;
  className?: string;
}

type SortDir = 'asc' | 'desc';

/**
 * Responsive data table (issue #22): a real `<table>` on md+ screens that
 * collapses into stacked definition-list cards below md. Sorting is enabled
 * per column via `sortValue` and exposed accessibly through sort buttons with
 * `aria-sort`.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  defaultSortIndex,
  className,
}: DataTableProps<T>) {
  const [sortIndex, setSortIndex] = useState<number | null>(defaultSortIndex ?? null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sortedRows = useMemo(() => {
    const column = sortIndex === null ? undefined : columns[sortIndex];
    if (!column?.sortValue) return rows;
    const value = column.sortValue;
    const direction = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      if (va < vb) return -1 * direction;
      if (va > vb) return 1 * direction;
      return 0;
    });
  }, [rows, columns, sortIndex, sortDir]);

  const toggleSort = (index: number) => {
    if (index === sortIndex) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortIndex(index);
      setSortDir('asc');
    }
  };

  return (
    <div className={cn('overflow-hidden', className)}>
      {/* Desktop / tablet: real table markup with caption + th scope */}
      <table className="hidden w-full text-sm md:table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {columns.map((column, index) => {
              const sortable = Boolean(column.sortValue);
              const isSorted = sortable && index === sortIndex;
              return (
                <th
                  key={index}
                  scope="col"
                  aria-sort={
                    isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400',
                    column.className,
                  )}
                >
                  {sortable ? (
                    <button
                      onClick={() => toggleSort(index)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      {column.header}
                      {isSorted ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        )
                      ) : (
                        <ChevronsUpDown
                          className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            >
              {columns.map((column, index) => (
                <td key={index} className={cn('px-4 py-3 align-middle', column.className)}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: each row becomes a stacked definition-list card */}
      <ul
        className="divide-y divide-slate-100 md:hidden dark:divide-slate-800"
        aria-label={caption}
      >
        {sortedRows.map((row) => (
          <li key={rowKey(row)} className="py-3">
            <dl className="space-y-2">
              {columns.map((column, index) => {
                const value = column.cell(row);
                // Skip empty cells so sparse rows stay compact on mobile.
                if (value === null || value === undefined || value === false) return null;
                return (
                  <div key={index} className="flex items-center justify-between gap-4">
                    <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {column.header}
                    </dt>
                    <dd className="min-w-0 text-right text-sm text-slate-900 dark:text-slate-100">
                      {value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
