'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { Badge, FilterBar, SearchInput, StatusDot, Card, EmptyState, cn } from '@mizpah-pulse/ui';
import type { EventCategory, LiveEvent } from '@mizpah-pulse/types';
import { formatTimeAgo } from '@/lib/date-utils';
import { truncateAddress } from '@/lib/display-utils';
import { formatCompactNumber } from '@/lib/format-number';
import { MAX_EVENT_BUFFER } from '@/lib/constants';
import {
  Activity,
  ArrowUpDown,
  Filter,
  SlidersHorizontal,
  Zap,
  Radio,
} from 'lucide-react';

/** Maximum number of events to keep in the buffer (from shared constants) */

interface FeedEvent {
  id: string;
  type: string;
  category: EventCategory | string;
  title: string;
  from: string;
  to?: string;
  amount?: string;
  time: string;
  status: 'success' | 'error' | 'warning' | 'info';
  timestamp: number;
}

const statusDotColors: Record<string, string> = {
  success: 'bg-emerald-400',
  error: 'bg-red-400',
  warning: 'bg-amber-400',
  info: 'bg-sky-400',
};

const categoryVariantMap: Record<string, string> = {
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


/**
 * Build a human-readable title from a WebSocket event
 */
function buildEventTitle(event: LiveEvent): string {
  const data = event.data as Record<string, unknown> | undefined;
  const eventType = event.eventType;

  switch (eventType) {
    case 'PAYMENT':
      return `Payment: ${data?.amount || '?'} ${data?.assetCode || 'XLM'}`;
    case 'SOROBAN_INVOKE':
      return `Contract Call: ${(data?.functionName as string) || 'invoke()'}`;
    case 'SOROBAN_DEPLOY':
      return 'Contract Deployed';
    case 'SOROBAN_EVENT':
      return `Contract Event: ${(data?.eventName as string) || 'unknown'}`;
    case 'DEX_TRADE':
      return `DEX Trade: ${data?.sellingAsset || '?'}/${data?.buyingAsset || '?'}`;
    case 'NFT_TRANSFER':
      return `NFT Transfer: #${data?.tokenId || '?'}`;
    case 'NFT_MINT':
      return `NFT Minted: #${data?.tokenId || '?'}`;
    case 'TOKEN_TRANSFER':
      return `Token Transfer: ${data?.amount || '?'} ${data?.assetCode || ''}`;
    case 'CREATE_ACCOUNT':
      return 'Account Created';
    case 'ACCOUNT_MERGE':
      return 'Account Merged';
    case 'LIQUIDITY_POOL_DEPOSIT':
      return 'LP Deposit';
    case 'LIQUIDITY_POOL_WITHDRAW':
      return 'LP Withdrawal';
    case 'MANAGE_BUY_OFFER':
      return 'Buy Offer';
    case 'MANAGE_SELL_OFFER':
      return 'Sell Offer';
    case 'CLAWBACK':
      return 'Clawback';
    default:
      return eventType.replace(/_/g, ' ');
  }
}

export default function FeedPage() {
  const { isConnected: wsConnected, lastEvent, connectionStats } = useWebSocket({ enabled: true });
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  // Process incoming WebSocket events
  useEffect(() => {
    if (!lastEvent) return;

    const rawEvent = lastEvent as LiveEvent;
    const category = (rawEvent.data as Record<string, unknown> | undefined)?.category as string || 'UNKNOWN';
    const accountId = (rawEvent.data as Record<string, unknown> | undefined)?.accountId as string || '';
    const title = buildEventTitle(rawEvent);

    const feedEvent: FeedEvent = {
      id: `evt-${++idCounter.current}-${Date.now()}`,
      type: rawEvent.eventType,
      category: category,
      title,
      from: accountId ? truncateAddress(accountId) : '—',
      to: (rawEvent.data as Record<string, unknown> | undefined)?.to as string | undefined,
      amount: (rawEvent.data as Record<string, unknown> | undefined)?.amount as string | undefined,
      time: 'just now',
      status: 'success',
      timestamp: Date.now(),
    };

    setEvents((prev) => {
      const updated = [feedEvent, ...prev];
      return updated.slice(0, MAX_EVENT_BUFFER);
    });
  }, [lastEvent]);

  // Update relative timestamps every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents((prev) =>
        prev.map((e) => ({
          ...e,
          time: formatTimeAgo(new Date(e.timestamp)),
        })),
      );
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && !isPaused && feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, autoScroll, isPaused]);

  // Filter and sort
  const filteredEvents = events.filter((event) => {
    if (selectedCategories.length > 0 && !selectedCategories.includes(event.category)) return false;
    if (search && !event.title.toLowerCase().includes(search.toLowerCase()) && !event.from.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sortedEvents = sortOrder === 'desc' ? filteredEvents : [...filteredEvents].reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100" id="feed-heading">Live Activity Feed</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time Stellar blockchain events stream
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusDot
            status={wsConnected ? 'online' : 'offline'}
            label={wsConnected ? 'Live' : 'Disconnected'}
            pulse={wsConnected}
          />
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              !isPaused
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
            )}
            aria-label={isPaused ? 'Resume live feed' : 'Pause live feed'}
            aria-pressed={isPaused}
          >
            {isPaused ? 'Paused' : 'Live'}
          </button>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              autoScroll
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
            )}
            aria-label={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
          >
            Auto-scroll {autoScroll ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'WS Status', value: wsConnected ? 'Connected' : 'Offline', icon: Radio },
          { label: 'Events Buffer', value: formatCompactNumber(events.length), icon: Activity },
          { label: 'Filtered', value: String(sortedEvents.length), icon: Filter },
          { label: 'Sort', value: sortOrder === 'desc' ? 'Newest' : 'Oldest', icon: ArrowUpDown },
        ].map((stat) => (
          <Card key={stat.label} padding="sm">
            <div className="flex items-center gap-2">
              <stat.icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
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
          aria-label={`Sort ${sortOrder === 'desc' ? 'oldest first' : 'newest first'}`}
        >
          <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
          {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      {/* Event Feed */}
      <div
        className="space-y-2"
        role="feed"
        aria-label="Blockchain event feed"
        aria-busy={!wsConnected}
      >
        {!wsConnected && events.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Radio className="h-10 w-10" />}
              title="Connecting to event stream..."
              description="Waiting for WebSocket connection to the blockchain event server"
            />
          </Card>
        ) : sortedEvents.length === 0 ? (
          <Card>
            <EmptyState
              icon={<SlidersHorizontal className="h-10 w-10" />}
              title="No events match your filters"
              description="Try adjusting your search or category filters"
            />
          </Card>
        ) : (
          sortedEvents.map((event, idx) => (
            <article
              key={event.id}
              className="feed-item group flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 transition-all duration-200 hover:border-slate-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              style={{ animationDelay: `${idx * 30}ms` }}
              role="article"
              aria-label={`${event.type} event: ${event.title}`}
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
                aria-hidden="true"
              />

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {event.title}
                  </span>
                  <Badge variant={(categoryVariantMap[event.category] || 'default') as 'success' | 'info' | 'purple' | 'pink' | 'amber' | 'warning' | 'error' | 'default'}>
                    {event.category}
                  </Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono">{event.from}</span>
                  {event.to && (
                    <>
                      <span aria-hidden="true">→</span>
                      <span className="font-mono">{event.to}</span>
                    </>
                  )}
                  {event.amount && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">•</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {event.amount}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Time */}
              <div className="flex-shrink-0 text-right">
                <time className="text-xs text-slate-400 dark:text-slate-500" dateTime={new Date(event.timestamp).toISOString()}>
                  {event.time}
                </time>
              </div>

              {/* Hover action */}
              <button
                className="hidden rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-indigo-500 group-hover:block dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                aria-label={`Inspect ${event.type} event`}
              >
                <Zap className="h-4 w-4" aria-hidden="true" />
              </button>
            </article>
          ))
        )}
        <div ref={feedEndRef} />
      </div>
    </div>
  );
}
