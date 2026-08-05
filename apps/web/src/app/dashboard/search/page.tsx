'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, cn, EmptyState, Spinner, Badge } from '@mizpah-pulse/ui';
import { useDebounce } from '@/hooks/use-debounce';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';
import { Search, Hash, Wallet, FileCode, Coins } from 'lucide-react';

interface SearchResult {
  transactions?: Array<{ hash: string; found: boolean; eventType?: string; timestamp?: string }>;
  accounts?: Array<{ publicKey: string; eventCount: number; recentEvents: Array<{ id: string; eventType: string; timestamp: string }> }>;
  contracts?: Array<{ contractId: string; eventCount: number; recentEvents: number }>;
  events?: Array<{ id: string; eventType: string; category: string; timestamp: string; accountId?: string }>;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global ⌘K / Ctrl+K shortcut — focus the search box from anywhere
  const focusSearch = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);
  useKeyboardShortcut([
    { key: 'k', ctrl: true, handler: focusSearch },
    { key: 'k', meta: true, handler: focusSearch },
  ]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null);
      setError(null);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(debouncedQuery)}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.data.results);
        } else {
          setError(data.error?.message || 'Search failed');
        }
      } catch {
        setError('Failed to connect to search service');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const searchTypes = [
    { icon: Wallet, label: 'Wallet Address', placeholder: 'GABC...' },
    { icon: Hash, label: 'Transaction Hash', placeholder: 'abc123...' },
    { icon: FileCode, label: 'Contract ID', placeholder: 'CA7G...' },
    { icon: Coins, label: 'Asset Code', placeholder: 'USDC' },
  ];

  const totalResults = results
    ? Object.values(results).reduce((s, arr) => s + (arr?.length || 0), 0)
    : 0;

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
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by address, tx hash, contract ID, or asset..."
            className="w-full rounded-xl border border-slate-200 bg-white py-4 pl-12 pr-16 text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            autoFocus
          />
          <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
            ⌘K
          </kbd>
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Spinner size="sm" />
            </div>
          )}
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

        {/* Results */}
        {query.length >= 2 && (
          <div className="mt-6 space-y-4">
            {error && (
              <Card padding="md" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </Card>
            )}

            {results && totalResults === 0 && !loading && (
              <EmptyState
                icon={<Search className="h-10 w-10" />}
                title="No results found"
                description={`No matches for "${query}". Try a different search term.`}
              />
            )}

            {results?.accounts?.map((account) => (
              <Card key={account.publicKey} padding="md">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-indigo-500" />
                  <div>
                    <p className="font-mono text-sm text-slate-900 dark:text-slate-100">
                      {account.publicKey.slice(0, 12)}...{account.publicKey.slice(-8)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {account.eventCount} events found
                    </p>
                  </div>
                  <Badge variant="info" size="sm">Account</Badge>
                </div>
              </Card>
            ))}

            {results?.transactions?.map((tx) => (
              <Card key={tx.hash} padding="md">
                <div className="flex items-center gap-3">
                  <Hash className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="font-mono text-sm text-slate-900 dark:text-slate-100">
                      {tx.hash.slice(0, 20)}...
                    </p>
                    <p className="text-xs text-slate-400">{tx.eventType || 'Transaction'}</p>
                  </div>
                  <Badge variant="success" size="sm">TX</Badge>
                </div>
              </Card>
            ))}

            {results?.contracts?.map((contract) => (
              <Card key={contract.contractId} padding="md">
                <div className="flex items-center gap-3">
                  <FileCode className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-mono text-sm text-slate-900 dark:text-slate-100">
                      {contract.contractId.slice(0, 12)}...{contract.contractId.slice(-8)}
                    </p>
                    <p className="text-xs text-slate-400">{contract.eventCount} events</p>
                  </div>
                  <Badge variant="purple" size="sm">Contract</Badge>
                </div>
              </Card>
            ))}

            {results?.events?.map((event) => (
              <Card key={event.id} padding="md">
                <div className="flex items-center gap-3">
                  <Coins className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {event.eventType.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-slate-400">
                      {event.accountId
                        ? `${event.accountId.slice(0, 8)}...${event.accountId.slice(-4)}`
                        : ''}{' '}
                      · {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="default" size="sm">{event.category}</Badge>
                </div>
              </Card>
            ))}

            {totalResults > 0 && (
              <p className="text-center text-xs text-slate-400">
                {totalResults} result{totalResults !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
