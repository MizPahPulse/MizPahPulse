'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { Badge, FilterBar, SearchInput, StatusDot, Card, EmptyState, cn } from '@mizpah-pulse/ui';
import type { EventCategory } from '@mizpah-pulse/types';
import {
  Activity,
  ArrowUpDown,
  Filter,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';

const MOCK_EVENTS = [
  { id: '1', type: 'PAYMENT', category: 'PAYMENT' as EventCategory, title: 'Payment: 100 XLM', from: 'GABC...XYZ', to: 'GDEF...UVW', amount: '100 XLM', time: '2s ago', status: 'success' as const },
  { id: '2', type: 'SOROBAN_INVOKE', category: 'CONTRACT' as EventCategory, title: 'swap() called on CA7G...KLM', from: 'GXLM...PQR', amount: '0.5 XLM fee', time: '5s ago', status: 'success' as const },
  { id: '3', type: 'DEX_TRADE', category: 'DEX' as EventCategory, title: 'DEX Trade: USDC/XLM', from: 'GDEF...UVW', to: 'GYZX...ABC', amount: '500 USDC → 4,750 XLM', time: '8s ago', status: 'success' as const },
  { id: '4', type: 'SOROBAN_EVENT', category: 'CONTRACT' as EventCategory, title: 'Event: Transfer(address,uint256)', from: 'CASW...FGH', amount: '', time: '8s ago', status: 'error' as const },
  { id: '5', type: 'TOKEN_TRANSFER', category: 'TOKEN' as EventCategory, title: 'Token Transfer: 1,000 USDC', from: 'GABC...XYZ', to: 'GDEF...UVW', amount: '1,000 USDC', time: '12s ago', status: 'success' as const },
  { id: '6', type: 'NFT_TRANSFER', category: 'NFT' as EventCategory, title: 'NFT #5678 transferred', from: 'GKLM...NOP', to: 'GABC...XYZ', amount: 'NFT #5678', time: '15s ago', status: 'success' as const },
  { id: '7', type: 'CREATE_ACCOUNT', category: 'ACCOUNT' as EventCategory, title: 'Account Created', from: 'GQRW...TUV', amount: '10 XLM funded', time: '18s ago', status: 'success' as const },
  { id: '8', type: 'LIQUIDITY_POOL_DEPOSIT', category: 'LIQUIDITY' as EventCategory, title: 'LP Deposit: XLM/USDC Pool', from: 'GZXC...BNM', amount: '500 XLM + 5,000 USDC', time: '22s ago', status: 'success' as const },
  { id: '9', type: 'MANAGE_SELL_OFFER', category: 'DEX' as EventCategory, title: 'Sell Offer Created', from: 'GPOI...LKJ', amount: '1,000 XLM for USDC', time: '25s ago', status: 'success' as const },
  { id: '10', type: 'CLAWBACK', category: 'TOKEN' as EventCategory, title: 'Clawback: 500 USDC', from: 'GASS...SET', to: 'GABC...XYZ', amount: '500 USDC', time: '30s ago', status: 'warning' as const },
];

const statusDotColors: Record<string, string> = {
  success: 'bg-emerald-400',
  error: 'bg-red-400',
  warning: 'bg-amber-400',
  info: 'bg-sky-400',
};

const categoryVariantMap: Record<EventCategory, 'success' | 'info' | 'purple' | 'pink' | 'amber' | 'warning' | 'error' | 'default'> = {
  PAYMENT: 'success',
  ACCOUNT: 'info',
  DEX: 'purple',
  NFT: 'pink',
  TOKEN: 'amber',
  CONTRACT: 'info',
  SYSTEM: 'default',
  GOVERNANCE: 'warning',
  LIQUIDITY: 'info',
  UNKNOWN: 'default',
};

const categoryOptions = [
  { label: 'All', value: 'all' },
  { label: 'Payments', value: 'PAYMENT' },
  { label: 'Contracts', value: 'CONTRACT' },
  { label: 'DEX', value: 'DEX' },
  { label: 'NFTs', value: 'NFT' },
  { label: 'Tokens', value: 'TOKEN' },
  { label: 'Accounts', value: 'ACCOUNT' },
  { label: 'Liquidity', value: 'LIQUIDITY' },
  { label: 'Governance', value: 'GOVERNANCE' },
];

export default function FeedPage() {
  const { isConnected, lastEvent } = useWebSocket({ enabled: true });
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [autoScroll, setAutoScroll] = useState(true);

  const filteredEvents = MOCK_EVENTS.filter((event) => {
    if (selectedCategories.length > 0 && !selectedCategories.includes(event.category)) return false;
    if (search && !event.title.toLowerCase().includes(search.toLowerCase()) && !event.from.includes(search)) return false;
    return true;
  });

  const sortedEvents = sortOrder === 'desc' ? filteredEvents : [...filteredEvents].reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Live Activity Feed</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time Stellar blockchain events stream
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusDot
            status={isConnected ? 'online' : 'offline'}
            label={isConnected ? 'Live' : 'Disconnected'}
            pulse={isConnected}
          />
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              autoScroll
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
            )}
          >
            Auto-scroll {autoScroll ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Events/sec', value: '3.2', icon: Zap },
          { label: 'Today', value: '1,247', icon: Activity },
          { label: 'Filtered', value: String(sortedEvents.length), icon: Filter },
          { label: 'Sort', value: sortOrder === 'desc' ? 'Newest' : 'Oldest', icon: ArrowUpDown },
        ].map((stat) => (
          <Card key={stat.label} padding="sm">
            <div className="flex items-center gap-2">
              <stat.icon className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  {stat.label}
                </p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {stat.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by address, hash, or event type..."
          className="w-full sm:w-80"
        />
        <FilterBar
          options={categoryOptions}
          selected={selectedCategories}
          onChange={setSelectedCategories}
          label="Category"
        />
        <button
          onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      {/* Event Feed */}
      <div className="space-y-2">
        {sortedEvents.length === 0 ? (
          <Card>
            <EmptyState
              icon={<SlidersHorizontal className="h-10 w-10" />}
              title="No events match your filters"
              description="Try adjusting your search or category filters"
            />
          </Card>
        ) : (
          sortedEvents.map((event, idx) => (
            <div
              key={event.id}
              className="feed-item group flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 transition-all duration-200 hover:border-slate-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              {/* Status dot */}
              <span
                className={cn(
                  'h-3 w-3 flex-shrink-0 rounded-full ring-4 ring-opacity-20',
                  statusDotColors[event.status],
                  event.status === 'success' && 'ring-emerald-100 dark:ring-emerald-900',
                  event.status === 'error' && 'ring-red-100 dark:ring-red-900',
                  event.status === 'warning' && 'ring-amber-100 dark:ring-amber-900',
                )}
              />

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {event.title}
                  </span>
                  <Badge variant={categoryVariantMap[event.category]}>
                    {event.category}
                  </Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono">{event.from}</span>
                  {event.to && (
                    <>
                      <span>→</span>
                      <span className="font-mono">{event.to}</span>
                    </>
                  )}
                  {event.amount && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {event.amount}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Time */}
              <div className="flex-shrink-0 text-right">
                <span className="text-xs text-slate-400 dark:text-slate-500">{event.time}</span>
              </div>

              {/* Hover action */}
              <button className="hidden rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-indigo-500 group-hover:block dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400">
                <Zap className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


