'use client';

import React, { useState } from 'react';
import { Card, cn, EmptyState } from '@mizpah-pulse/ui';
import { Search, Hash, Wallet, FileCode, Coins } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');

  const searchTypes = [
    { icon: Wallet, label: 'Wallet Address', placeholder: 'GABC...' },
    { icon: Hash, label: 'Transaction Hash', placeholder: 'abc123...' },
    { icon: FileCode, label: 'Contract ID', placeholder: 'CA7G...' },
    { icon: Coins, label: 'Asset Code', placeholder: 'USDC' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Search</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Search across wallets, transactions, contracts, and assets
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by address, tx hash, contract ID, or asset..."
            className="w-full rounded-xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {searchTypes.map((type) => (
            <Card key={type.label} hover padding="md">
              <div className="flex items-center gap-3">
                <type.icon className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{type.label}</p>
                  <p className="text-xs text-slate-400">{type.placeholder}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {query && (
          <Card padding="lg" className="mt-6">
            <EmptyState
              icon={<Search className="h-10 w-10" />}
              title="No results found"
              description={`No results for "${query}". Try a different search term.`}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
