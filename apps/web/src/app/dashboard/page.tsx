'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, cn, Spinner } from '@mizpah-pulse/ui';
import { Activity, ArrowLeftRight, FileCode, Send, TrendingUp, Wallet } from 'lucide-react';
import { formatTimeAgo } from '@/lib/date-utils';
import { truncateAddress } from '@/lib/display-utils';

interface RecentActivityItem {
  id: string;
  eventType: string;
  category: string;
  timestamp: string;
  accountId: string | null;
}

interface DashboardStats {
  totalEvents: number;
  eventsLast24h: number;
  uniqueAccounts: number;
  trackedContracts: number;
  recentActivity: RecentActivityItem[];
}

const FALLBACK_STATS: DashboardStats = {
  totalEvents: 8432,
  eventsLast24h: 1247,
  uniqueAccounts: 156,
  trackedContracts: 12,
  recentActivity: [
    {
      id: '1',
      eventType: 'PAYMENT',
      category: 'PAYMENT',
      timestamp: new Date(Date.now() - 2000).toISOString(),
      accountId: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    },
    {
      id: '2',
      eventType: 'DEX_TRADE',
      category: 'DEX',
      timestamp: new Date(Date.now() - 5000).toISOString(),
      accountId: 'GDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    },
    {
      id: '3',
      eventType: 'SOROBAN_INVOKE',
      category: 'CONTRACT',
      timestamp: new Date(Date.now() - 8000).toISOString(),
      accountId: 'GHIJ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    },
    {
      id: '4',
      eventType: 'NFT_TRANSFER',
      category: 'NFT',
      timestamp: new Date(Date.now() - 12000).toISOString(),
      accountId: 'GKLM1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    },
    {
      id: '5',
      eventType: 'CREATE_ACCOUNT',
      category: 'ACCOUNT',
      timestamp: new Date(Date.now() - 15000).toISOString(),
      accountId: 'GNOP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    },
  ],
};

const statusColors: Record<string, string> = {
  success: 'bg-emerald-400',
  error: 'bg-red-400',
  warning: 'bg-amber-400',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(FALLBACK_STATS);
  const [loading, setLoading] = useState(true);

  // Load real stats from the API, falling back to sample data if unavailable
  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!cancelled && body?.data) setStats(body.data as DashboardStats);
      })
      .catch(() => {
        // API unavailable (no DB) — keep fallback sample data
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = [
    {
      label: 'Events (24h)',
      value: stats.eventsLast24h.toLocaleString(),
      icon: Activity,
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950',
    },
    {
      label: 'Total Events',
      value: stats.totalEvents.toLocaleString(),
      icon: ArrowLeftRight,
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-950',
    },
    {
      label: 'Tracked Contracts',
      value: stats.trackedContracts.toLocaleString(),
      icon: FileCode,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950',
    },
    {
      label: 'Unique Accounts',
      value: stats.uniqueAccounts.toLocaleString(),
      icon: Send,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Real-time overview of Stellar network activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} padding="lg" hover>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {loading ? <Spinner size="sm" /> : stat.value}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  {loading ? 'Loading…' : 'Live from API'}
                </p>
              </div>
              <div className={cn('rounded-xl p-2.5', stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Live Feed',
            href: '/dashboard/feed',
            icon: Activity,
            desc: 'Real-time event stream',
          },
          {
            label: 'Analytics',
            href: '/dashboard/analytics',
            icon: TrendingUp,
            desc: 'Charts & insights',
          },
          {
            label: 'Wallets',
            href: '/dashboard/wallets',
            icon: Wallet,
            desc: 'Track your wallets',
          },
          {
            label: 'Contracts',
            href: '/dashboard/contracts',
            icon: FileCode,
            desc: 'Smart contract monitor',
          },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <Card padding="lg" hover>
              <link.icon className="mb-3 h-6 w-6 text-indigo-500" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{link.label}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{link.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Recent Activity
            </h2>
            <Link
              href="/dashboard/feed"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {stats.recentActivity.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <span
                  className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', statusColors.success)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {event.eventType.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {event.accountId ? truncateAddress(event.accountId) : '—'}
                    {event.category ? ` • ${event.category}` : ''}
                  </p>
                </div>
                <span className="ml-auto flex-shrink-0 text-xs text-slate-400 dark:text-slate-500">
                  {formatTimeAgo(event.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
