'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, cn, EmptyState, Spinner, Skeleton, Badge } from '@mizpah-pulse/ui';
import { useDebounce } from '@/hooks/use-debounce';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';
import { Search, Hash, Wallet, FileCode, Coins } from 'lucide-react';

interface SearchResult {
  transactions?: Array<{ hash: string; found: boolean; eventType?: string; timestamp?: string }>;
  accounts?: Array<{
    publicKey: string;
    eventCount: number;
    recentEvents: Array<{ id: string; eventType: string; timestamp: string }>;
  }>;
  contracts?: Array<{ contractId: string; eventCount: number; recentEvents: number }>;
  events?: Array<{
    id: string;
    eventType: string;
    category: string;
    timestamp: string;
    accountId?: string;
  }>;
}

/** A flattened search result row, used for keyboard navigation. */
interface FlatResult {
  type: 'account' | 'tx' | 'contract' | 'event';
  id: string;
  label: string;
  sublabel: string;
  url: string | null;
}

/** Stellar expert testnet explorer link, matching the rest of the app. */
function explorerUrl(kind: 'account' | 'tx' | 'contract', id: string): string {
  return `https://stellar.expert/explorer/testnet/${kind}/${id}`;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten grouped results into a single ordered list for arrow-key navigation.
  const items = useMemo<FlatResult[]>(() => {
    if (!results) return [];
    const list: FlatResult[] = [];
    results.accounts?.forEach((account) => {
      list.push({
        type: 'account',
        id: `search-result-account-${account.publicKey}`,
        label: `${account.publicKey.slice(0, 12)}...${account.publicKey.slice(-8)}`,
        sublabel: `${account.eventCount} events found`,
        url: explorerUrl('account', account.publicKey),
      });
    });
    results.transactions?.forEach((tx) => {
      list.push({
        type: 'tx',
        id: `search-result-tx-${tx.hash}`,
        label: `${tx.hash.slice(0, 20)}...`,
        sublabel: tx.eventType || 'Transaction',
        url: explorerUrl('tx', tx.hash),
      });
    });
    results.contracts?.forEach((contract) => {
      list.push({
        type: 'contract',
        id: `search-result-contract-${contract.contractId}`,
        label: `${contract.contractId.slice(0, 12)}...${contract.contractId.slice(-8)}`,
        sublabel: `${contract.eventCount} events`,
        url: explorerUrl('contract', contract.contractId),
      });
    });
    results.events?.forEach((event) => {
      list.push({
        type: 'event',
        id: `search-result-event-${event.id}`,
        label: event.eventType.replace(/_/g, ' '),
        sublabel: `${event.accountId ? `${event.accountId.slice(0, 8)}...${event.accountId.slice(-4)}` : ''} · ${new Date(event.timestamp).toLocaleString()}`,
        url: event.accountId ? explorerUrl('account', event.accountId) : null,
      });
    });
    return list;
  }, [results]);

  const activeItem = activeIndex >= 0 && activeIndex < items.length ? items[activeIndex] : null;

  // Reset the active result whenever the result set changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [items]);

  // Global ⌘K / Ctrl+K shortcut — focus the search box from anywhere
  const focusSearch = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);
  useKeyboardShortcut([
    { key: 'k', ctrl: true, handler: focusSearch },
    { key: 'k', meta: true, handler: focusSearch },
  ]);

  // Arrow-key navigation over the flattened results (issue #8).
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (items.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
      } else if (e.key === 'Enter') {
        const item = activeIndex >= 0 && activeIndex < items.length ? items[activeIndex] : null;
        if (item?.url) {
          e.preventDefault();
          window.open(item.url, '_blank', 'noopener,noreferrer');
        }
      } else if (e.key === 'Escape') {
        setActiveIndex(-1);
      }
    },
    [items, activeIndex],
  );

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
            onKeyDown={handleKeyDown}
            placeholder="Search by address, tx hash, contract ID, or asset..."
            aria-label="Search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={items.length > 0}
            aria-controls="search-results-listbox"
            aria-activedescendant={activeItem?.id}
            className="w-full rounded-xl border border-slate-200 bg-white py-4 pl-12 pr-16 text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            autoFocus
          />
          <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
            ⌘K
          </kbd>
          {loading && results !== null && (
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
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {type.label}
                  </p>
                  <p className="text-xs text-slate-400">{type.placeholder}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Results */}
        {query.length >= 2 && (
          <div
            id="search-results-listbox"
            role="listbox"
            aria-label="Search results"
            className="mt-6 space-y-4"
            aria-busy={loading}
          >
            {/* Skeleton rows shown while the first search is in flight */}
            {loading && results === null && (
              <div className="space-y-3" data-testid="search-results-skeleton" aria-hidden="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <Skeleton variant="circular" className="h-8 w-8" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-64" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {error && (
              <Card
                padding="md"
                className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
              >
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

            {results?.accounts?.map((account) => {
              const itemId = `search-result-account-${account.publicKey}`;
              const isActive = activeItem?.id === itemId;
              return (
                <Card
                  key={account.publicKey}
                  id={itemId}
                  role="option"
                  aria-selected={isActive}
                  padding="md"
                  className={cn(
                    'cursor-pointer transition-shadow',
                    isActive && 'border-indigo-300 ring-2 ring-indigo-500 dark:border-indigo-600',
                  )}
                  onClick={() =>
                    window.open(
                      explorerUrl('account', account.publicKey),
                      '_blank',
                      'noopener,noreferrer',
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="font-mono text-sm text-slate-900 dark:text-slate-100">
                        {account.publicKey.slice(0, 12)}...{account.publicKey.slice(-8)}
                      </p>
                      <p className="text-xs text-slate-400">{account.eventCount} events found</p>
                    </div>
                    <Badge variant="info" size="sm">
                      Account
                    </Badge>
                  </div>
                </Card>
              );
            })}

            {results?.transactions?.map((tx) => {
              const itemId = `search-result-tx-${tx.hash}`;
              const isActive = activeItem?.id === itemId;
              return (
                <Card
                  key={tx.hash}
                  id={itemId}
                  role="option"
                  aria-selected={isActive}
                  padding="md"
                  className={cn(
                    'cursor-pointer transition-shadow',
                    isActive && 'border-indigo-300 ring-2 ring-indigo-500 dark:border-indigo-600',
                  )}
                  onClick={() =>
                    window.open(explorerUrl('tx', tx.hash), '_blank', 'noopener,noreferrer')
                  }
                >
                  <div className="flex items-center gap-3">
                    <Hash className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="font-mono text-sm text-slate-900 dark:text-slate-100">
                        {tx.hash.slice(0, 20)}...
                      </p>
                      <p className="text-xs text-slate-400">{tx.eventType || 'Transaction'}</p>
                    </div>
                    <Badge variant="success" size="sm">
                      TX
                    </Badge>
                  </div>
                </Card>
              );
            })}

            {results?.contracts?.map((contract) => {
              const itemId = `search-result-contract-${contract.contractId}`;
              const isActive = activeItem?.id === itemId;
              return (
                <Card
                  key={contract.contractId}
                  id={itemId}
                  role="option"
                  aria-selected={isActive}
                  padding="md"
                  className={cn(
                    'cursor-pointer transition-shadow',
                    isActive && 'border-indigo-300 ring-2 ring-indigo-500 dark:border-indigo-600',
                  )}
                  onClick={() =>
                    window.open(
                      explorerUrl('contract', contract.contractId),
                      '_blank',
                      'noopener,noreferrer',
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <FileCode className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-mono text-sm text-slate-900 dark:text-slate-100">
                        {contract.contractId.slice(0, 12)}...{contract.contractId.slice(-8)}
                      </p>
                      <p className="text-xs text-slate-400">{contract.eventCount} events</p>
                    </div>
                    <Badge variant="purple" size="sm">
                      Contract
                    </Badge>
                  </div>
                </Card>
              );
            })}

            {results?.events?.map((event) => {
              const itemId = `search-result-event-${event.id}`;
              const isActive = activeItem?.id === itemId;
              return (
                <Card
                  key={event.id}
                  id={itemId}
                  role="option"
                  aria-selected={isActive}
                  padding="md"
                  className={cn(
                    'cursor-pointer transition-shadow',
                    isActive && 'border-indigo-300 ring-2 ring-indigo-500 dark:border-indigo-600',
                  )}
                  onClick={() =>
                    event.accountId &&
                    window.open(
                      explorerUrl('account', event.accountId),
                      '_blank',
                      'noopener,noreferrer',
                    )
                  }
                >
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
                    <Badge variant="default" size="sm">
                      {event.category}
                    </Badge>
                  </div>
                </Card>
              );
            })}

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
