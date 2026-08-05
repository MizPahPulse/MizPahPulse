'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, cn, Skeleton } from '@mizpah-pulse/ui';
import {
  Activity,
  ArrowLeftRight,
  Coins,
  FileCode,
  TrendingUp,
  DollarSign,
  Users,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

// Simple inline chart component (avoids Recharts bundle issues)
function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const percent = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-full w-full rounded-sm bg-slate-100 dark:bg-slate-800">
      <div
        className={`h-full rounded-sm transition-all duration-500 ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

const chartColors = {
  payments: 'bg-emerald-400',
  dex: 'bg-purple-400',
  contracts: 'bg-indigo-400',
  nfts: 'bg-pink-400',
  tokens: 'bg-amber-400',
  accounts: 'bg-sky-400',
};

const categoryBarColors: Record<string, string> = {
  PAYMENT: 'bg-emerald-500',
  DEX: 'bg-purple-500',
  CONTRACT: 'bg-indigo-500',
  TOKEN: 'bg-amber-500',
  NFT: 'bg-pink-500',
  ACCOUNT: 'bg-sky-500',
  LIQUIDITY: 'bg-teal-500',
  GOVERNANCE: 'bg-rose-500',
  SYSTEM: 'bg-slate-500',
  UNKNOWN: 'bg-slate-400',
};

const CATEGORY_LABELS: Record<string, string> = {
  PAYMENT: 'Payments',
  DEX: 'DEX',
  CONTRACT: 'Contracts',
  TOKEN: 'Tokens',
  NFT: 'NFTs',
  ACCOUNT: 'Accounts',
  LIQUIDITY: 'Liquidity',
  GOVERNANCE: 'Governance',
  SYSTEM: 'System',
  UNKNOWN: 'Unknown',
};

/** Static fallback dataset used when the live API is unavailable (demo mode). */
const FALLBACK_HOURLY = [
  { hour: '00:00', payments: 45, dex: 12, contracts: 8, nfts: 3, tokens: 22, accounts: 5 },
  { hour: '02:00', payments: 32, dex: 8, contracts: 5, nfts: 2, tokens: 15, accounts: 3 },
  { hour: '04:00', payments: 28, dex: 6, contracts: 3, nfts: 1, tokens: 12, accounts: 2 },
  { hour: '06:00', payments: 55, dex: 15, contracts: 10, nfts: 4, tokens: 28, accounts: 8 },
  { hour: '08:00', payments: 89, dex: 28, contracts: 22, nfts: 8, tokens: 45, accounts: 15 },
  { hour: '10:00', payments: 120, dex: 42, contracts: 35, nfts: 12, tokens: 65, accounts: 22 },
  { hour: '12:00', payments: 145, dex: 52, contracts: 40, nfts: 18, tokens: 78, accounts: 28 },
  { hour: '14:00', payments: 168, dex: 58, contracts: 48, nfts: 22, tokens: 92, accounts: 35 },
  { hour: '16:00', payments: 155, dex: 55, contracts: 42, nfts: 16, tokens: 85, accounts: 30 },
  { hour: '18:00', payments: 132, dex: 45, contracts: 38, nfts: 14, tokens: 72, accounts: 25 },
  { hour: '20:00', payments: 98, dex: 35, contracts: 25, nfts: 9, tokens: 55, accounts: 18 },
  { hour: '22:00', payments: 72, dex: 22, contracts: 15, nfts: 5, tokens: 38, accounts: 12 },
];

const FALLBACK_CATEGORIES = [
  { label: 'Payments', value: 42, color: 'bg-emerald-500' },
  { label: 'DEX', value: 28, color: 'bg-purple-500' },
  { label: 'Contracts', value: 15, color: 'bg-indigo-500' },
  { label: 'Tokens', value: 8, color: 'bg-amber-500' },
  { label: 'NFTs', value: 4, color: 'bg-pink-500' },
  { label: 'Accounts', value: 3, color: 'bg-sky-500' },
];

const FALLBACK_CONTRACTS = [
  { name: 'USDC Token', calls: 842, address: 'CA7G...abc1' },
  { name: 'Aqua DEX Router', calls: 654, address: 'CB3X...def2' },
  { name: 'BLND Lending', calls: 421, address: 'CD9Y...ghi3' },
  { name: 'Mint NFT', calls: 298, address: 'CE2Z...jkl4' },
  { name: 'Staking V2', calls: 187, address: 'CF5W...mno5' },
];

interface StatsData {
  totalEvents: number;
  eventsLast24h: number;
  uniqueAccounts: number;
  trackedContracts: number;
}

interface EventItem {
  id: string;
  eventType: string;
  category: string;
  timestamp: string;
  accountId?: string | null;
  contractId?: string | null;
}

interface EventsPage {
  events: EventItem[];
}

interface HourlyPoint {
  hour: string;
  payments: number;
  dex: number;
  contracts: number;
  nfts: number;
  tokens: number;
  accounts: number;
}

/** Aggregate events into 2-hour buckets across the last 24h for the activity chart. */
function aggregateHourly(events: EventItem[]): HourlyPoint[] {
  const buckets: Record<
    number,
    {
      payments: number;
      dex: number;
      contracts: number;
      nfts: number;
      tokens: number;
      accounts: number;
    }
  > = {};
  const now = Date.now();

  for (const evt of events) {
    const ts = new Date(evt.timestamp).getTime();
    const ageHours = Math.floor((now - ts) / 3_600_000);
    if (ageHours < 0 || ageHours >= 24) continue;
    const slot = Math.floor(ageHours / 2) * 2; // 0,2,4,...,22 (hours ago)
    const bucket = (buckets[slot] ??= {
      payments: 0,
      dex: 0,
      contracts: 0,
      nfts: 0,
      tokens: 0,
      accounts: 0,
    });
    switch (evt.category) {
      case 'PAYMENT':
        bucket.payments++;
        break;
      case 'DEX':
        bucket.dex++;
        break;
      case 'CONTRACT':
        bucket.contracts++;
        break;
      case 'NFT':
        bucket.nfts++;
        break;
      case 'TOKEN':
        bucket.tokens++;
        break;
      case 'ACCOUNT':
        bucket.accounts++;
        break;
      default:
        break;
    }
  }

  // Map "hours ago" slots to a 24h timeline starting at 00:00.
  const points: HourlyPoint[] = [];
  const hour = new Date().getHours();
  for (let ago = 22; ago >= 0; ago -= 2) {
    const clock = (hour - ago + 24) % 24;
    const b = buckets[ago];
    points.push({
      hour: `${String(clock).padStart(2, '0')}:00`,
      payments: b?.payments ?? 0,
      dex: b?.dex ?? 0,
      contracts: b?.contracts ?? 0,
      nfts: b?.nfts ?? 0,
      tokens: b?.tokens ?? 0,
      accounts: b?.accounts ?? 0,
    });
  }
  return points;
}

/** Aggregate category counts into the display shape used by the breakdown card. */
function aggregateCategories(events: EventItem[]) {
  const counts = new Map<string, number>();
  for (const evt of events) {
    counts.set(evt.category, (counts.get(evt.category) ?? 0) + 1);
  }
  const total = events.length || 1;
  return [...counts.entries()]
    .map(([category, count]) => ({
      label: CATEGORY_LABELS[category] ?? category,
      value: Math.round((count / total) * 100),
      color: categoryBarColors[category] ?? 'bg-slate-400',
    }))
    .sort((a, b) => b.value - a.value);
}

/** Aggregate top contracts from the fetched event window. */
function aggregateTopContracts(events: EventItem[]) {
  const counts = new Map<string, number>();
  for (const evt of events) {
    if (evt.contractId) counts.set(evt.contractId, (counts.get(evt.contractId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([address, calls], idx) => ({
      name: `Contract #${idx + 1}`,
      calls,
      address: address.length > 12 ? `${address.slice(0, 4)}...${address.slice(-4)}` : address,
    }));
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'loading' | 'live' | 'sample'>('loading');
  const [hourlyData, setHourlyData] = useState<HourlyPoint[]>(FALLBACK_HOURLY);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [topContracts, setTopContracts] = useState(FALLBACK_CONTRACTS);

  const loadAnalytics = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    const startDate = encodeURIComponent(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    try {
      const [statsBody, eventsBody] = await Promise.all([
        apiFetch<StatsData>('/api/v1/stats', { signal }),
        apiFetch<EventsPage>(`/api/v1/events?limit=500&startDate=${startDate}`, { signal }),
      ]);
      if (signal?.aborted) return;
      setStats(statsBody);
      const events = eventsBody.events ?? [];
      setHourlyData(aggregateHourly(events));
      setCategories(aggregateCategories(events));
      setTopContracts(aggregateTopContracts(events));
      setDataSource('live');
    } catch {
      // API unavailable — keep the sample dataset for demo purposes.
      if (!signal?.aborted) setDataSource('sample');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadAnalytics(controller.signal);
    return () => controller.abort();
  }, [loadAnalytics]);

  const maxValue = Math.max(...hourlyData.map((d) => d.payments));

  const metricCards = [
    {
      label: 'Events (24h)',
      value: stats?.eventsLast24h?.toLocaleString() ?? '1,247',
      icon: DollarSign,
      trend: 'up' as const,
    },
    {
      label: 'Total Events',
      value: stats?.totalEvents?.toLocaleString() ?? '8,432',
      icon: Users,
      trend: 'up' as const,
    },
    {
      label: 'Tracked Contracts',
      value: stats?.trackedContracts?.toLocaleString() ?? '156',
      icon: Coins,
      trend: 'up' as const,
    },
    {
      label: 'Unique Accounts',
      value: stats?.uniqueAccounts?.toLocaleString() ?? '3,847',
      icon: FileCode,
      trend: 'up' as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Stellar network insights and historical trends
        </p>
        {dataSource === 'sample' && !loading && (
          <p
            role="status"
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
          >
            <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
            Showing sample data — live API unavailable
            <button
              onClick={() => void loadAnalytics()}
              className="font-semibold underline underline-offset-2"
            >
              Retry
            </button>
          </p>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => (
          <Card key={metric.label} padding="lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {metric.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {loading ? <Skeleton className="h-8 w-20" /> : metric.value}
                </p>
              </div>{' '}
              <metric.icon className="h-5 w-5 text-slate-300 dark:text-slate-600" />
            </div>
            <p className={cn('mt-2 text-xs font-medium', 'text-emerald-600 dark:text-emerald-400')}>
              {loading ? 'Loading…' : dataSource === 'live' ? 'Live from API' : 'Sample data'}
            </p>
          </Card>
        ))}
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Activity Over Time
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Last 24 hours</p>
        </CardHeader>
        <CardContent>
          <div className="h-64 space-y-1">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-5 flex-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))
              : hourlyData.map((d) => (
                  <div key={d.hour} className="flex items-center gap-3">
                    <span className="w-12 text-right text-[10px] text-slate-400">{d.hour}</span>
                    <div className="flex-1">
                      <div className="h-5 w-full rounded-sm bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-sm bg-gradient-to-r from-indigo-400 to-indigo-500 transition-all duration-500 dark:from-indigo-500 dark:to-indigo-600"
                          style={{ width: `${(d.payments / maxValue) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-12 text-[10px] text-slate-500 dark:text-slate-400">
                      {d.payments}
                    </span>
                  </div>
                ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Category Distribution
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categories.length === 0 && !loading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No events in the last 24 hours to aggregate.
                </p>
              ) : (
                categories.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-sm ${item.color}`} />
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                      {item.label}
                    </span>
                    <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
                      {item.value}%
                    </span>
                    <div className="w-32">
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-2 rounded-full ${item.color}`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Top Contracts (24h)
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topContracts.length === 0 && !loading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No contract activity in the last 24 hours.
                </p>
              ) : (
                topContracts.map((contract, idx) => (
                  <div
                    key={`${contract.address}-${idx}`}
                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {contract.name}
                      </p>
                      <p className="text-xs font-mono text-slate-400">{contract.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {contract.calls.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400">calls</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
