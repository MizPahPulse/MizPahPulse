import React from 'react';
import Link from 'next/link';
import { Card, CardContent, cn } from '@mizpah-pulse/ui';
import {
  Activity,
  ArrowLeftRight,
  FileCode,
  Gift,
  Send,
  Zap,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const stats = [
  { label: 'Events Today', value: '1,247', change: '+12%', icon: Activity, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950' },
  { label: 'Transactions', value: '8,432', change: '+5%', icon: ArrowLeftRight, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950' },
  { label: 'Active Contracts', value: '156', change: '+23%', icon: FileCode, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950' },
  { label: 'Payments', value: '3,892', change: '+8%', icon: Send, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950' },
];

const recentActivity = [
  { id: '1', type: 'PAYMENT', title: 'Payment: 100 XLM', from: 'GABC...XYZ', to: 'GDEF...UVW', time: '2s ago', status: 'success' },
  { id: '2', type: 'DEX_TRADE', title: 'DEX Trade: USDC/XLM', from: 'GDEF...UVW', amount: '500 USDC', time: '5s ago', status: 'success' },
  { id: '3', type: 'SOROBAN_INVOKE', title: 'Contract Call: swap()', from: 'GHIJ...RST', amount: '', time: '8s ago', status: 'error' },
  { id: '4', type: 'NFT_TRANSFER', title: 'NFT Transfer: #1234', from: 'GKLM...NOP', to: 'GABC...XYZ', time: '12s ago', status: 'success' },
  { id: '5', type: 'CREATE_ACCOUNT', title: 'Account Created', from: 'GQRW...TUV', amount: '10 XLM', time: '15s ago', status: 'success' },
];

const statusColors: Record<string, string> = {
  success: 'bg-emerald-400',
  error: 'bg-red-400',
  warning: 'bg-amber-400',
};

export default function DashboardPage() {
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
        {stats.map((stat) => (
          <Card key={stat.label} padding="lg" hover>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stat.value}
                </p>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {stat.change} from last hour
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
          { label: 'Live Feed', href: '/dashboard/feed', icon: Activity, desc: 'Real-time event stream' },
          { label: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp, desc: 'Charts & insights' },
          { label: 'Wallets', href: '/dashboard/wallets', icon: Wallet, desc: 'Track your wallets' },
          { label: 'Contracts', href: '/dashboard/contracts', icon: FileCode, desc: 'Smart contract monitor' },
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
            {recentActivity.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <span
                  className={cn(
                    'h-2.5 w-2.5 flex-shrink-0 rounded-full',
                    statusColors[event.status] || statusColors.warning,
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {event.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {event.from}
                    {event.to ? ` → ${event.to}` : ''}
                    {event.amount ? ` • ${event.amount}` : ''}
                  </p>
                </div>
                <span className="ml-auto flex-shrink-0 text-xs text-slate-400 dark:text-slate-500">
                  {event.time}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


