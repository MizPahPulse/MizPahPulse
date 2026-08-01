'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, Badge, cn, TruncatedKey, SearchInput, StatusDot, EmptyState, Spinner } from '@mizpah-pulse/ui';
import { Wallet, Plus, ExternalLink, ArrowUpRight, ArrowDownLeft, RefreshCw, Plug, Unplug } from 'lucide-react';

interface TrackedWallet {
  id: string;
  publicKey: string;
  label: string;
  balance: string;
  txCount: number;
  lastActivity: string;
  isConnected: boolean;
}

const mockWallets: TrackedWallet[] = [
  { id: '1', publicKey: 'GABCXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVW', label: 'Treasury', balance: '25,000 XLM', txCount: 342, lastActivity: '2 min ago', isConnected: true },
  { id: '2', publicKey: 'GDEFUVW1234567890ABCDEFGHIJKLMNOPQRSTUVW', label: 'Dev Wallet', balance: '1,500 XLM', txCount: 56, lastActivity: '1 hour ago', isConnected: false },
  { id: '3', publicKey: 'GHIJRST1234567890ABCDEFGHIJKLMNOPQRSTUVW', label: 'Hot Wallet', balance: '500 XLM', txCount: 12, lastActivity: '5 min ago', isConnected: true },
];

export default function WalletsPage() {
  const [search, setSearch] = useState('');
  const [wallets, setWallets] = useState<TrackedWallet[]>(mockWallets);
  const [connecting, setConnecting] = useState(false);

  const filtered = wallets.filter(
    (w) =>
      w.publicKey.toLowerCase().includes(search.toLowerCase()) ||
      w.label.toLowerCase().includes(search.toLowerCase()),
  );

  const connectFreighter = async () => {
    setConnecting(true);
    // Freighter wallet connection — to be implemented with @stellar/freighter-api
    await new Promise((r) => setTimeout(r, 1500));
    setConnecting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Wallets</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track and monitor your Stellar wallet activity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={connectFreighter}
            disabled={connecting}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50"
          >
            {connecting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Plug className="h-4 w-4" />
            )}
            {connecting ? 'Connecting...' : 'Connect Freighter'}
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
            <Plus className="h-4 w-4" />
            Add Wallet
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Tracked Wallets', value: wallets.length },
          { label: 'Connected', value: wallets.filter((w) => w.isConnected).length },
          { label: 'Total Transactions', value: wallets.reduce((s, w) => s + w.txCount, 0) },
        ].map((stat) => (
          <Card key={stat.label} padding="md">
            <div className="text-center">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by address or label..."
        className="w-full sm:w-96"
      />

      {/* Wallet List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-10 w-10" />}
            title="No wallets found"
            description="Add a wallet to start tracking activity"
            action={
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Add Your First Wallet
              </button>
            }
          />
        ) : (
          filtered.map((wallet) => (
            <Card key={wallet.id} padding="md" hover>
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950">
                  <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {wallet.label}
                    </span>
                    <StatusDot status={wallet.isConnected ? 'online' : 'offline'} />
                  </div>
                  <TruncatedKey publicKey={wallet.publicKey} className="text-xs text-slate-500" />
                </div>
                <div className="hidden text-right sm:block">
                  <p className="font-bold text-slate-900 dark:text-slate-100">{wallet.balance}</p>
                  <p className="text-xs text-slate-400">{wallet.txCount} txs</p>
                </div>
                <div className="hidden text-right lg:block">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Last activity</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{wallet.lastActivity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-slate-800">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
