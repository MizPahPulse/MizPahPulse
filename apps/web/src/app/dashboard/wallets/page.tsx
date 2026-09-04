'use client';

import React, { useState, useCallback } from 'react';
import { useWallet } from '@/context/WalletContext';
import { BalanceDisplay } from '@/components/BalanceDisplay';
import { MonitoredWallets } from '@/components/monitored-wallets';
import { TransactionModal } from '@/components/TransactionModal';
import {
  Card,
  cn,
  TruncatedKey,
  SearchInput,
  StatusDot,
  EmptyState,
  Spinner,
} from '@mizpah-pulse/ui';
import {
  Wallet,
  Plus,
  ExternalLink,
  Send,
  RefreshCw,
  Plug,
  Unplug,
  AlertTriangle,
} from 'lucide-react';

export default function WalletsPage() {
  const {
    publicKey,
    isConnected,
    isConnecting,
    state,
    error,
    connect,
    disconnect,
    isFreighterInstalled,
    refresh,
  } = useWallet();

  const [showSendModal, setShowSendModal] = useState(false);
  const [search, setSearch] = useState('');

  const handleConnect = useCallback(async () => {
    await connect();
  }, [connect]);

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // Explorer link for connected wallet
  const explorerUrl = publicKey
    ? `https://stellar.expert/explorer/testnet/account/${publicKey}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Wallets</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Connect your Freighter wallet to monitor activity and send transactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isConnected && publicKey ? (
            <>
              <button
                onClick={() => setShowSendModal(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25"
              >
                <Send className="h-4 w-4" />
                Send XLM
              </button>
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950"
              >
                <Unplug className="h-4 w-4" />
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting || !isFreighterInstalled}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50"
            >
              {isConnecting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plug className="h-4 w-4" />
              )}
              {isConnecting ? 'Connecting...' : 'Connect Freighter'}
            </button>
          )}
        </div>
      </div>

      {/* Freighter not installed warning */}
      {!isFreighterInstalled && (
        <Card
          padding="md"
          className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Freighter Wallet Not Detected
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Please install the{' '}
                <a
                  href="https://freighter.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Freighter browser extension
                </a>{' '}
                and refresh this page.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Connection error */}
      {error && (
        <Card padding="md" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                Connection Error
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card padding="md">
          <div className="text-center">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Connection Status
            </p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <StatusDot
                status={isConnected ? 'online' : isConnecting ? 'syncing' : 'offline'}
                pulse={isConnected}
              />
              <span className="text-lg font-bold capitalize text-slate-900 dark:text-slate-100">
                {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="text-center">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Network</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">Testnet</span>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="text-center">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Freighter</p>
            <div className="mt-1">
              <StatusDot
                status={isFreighterInstalled ? 'online' : 'offline'}
                label={isFreighterInstalled ? 'Installed' : 'Not Found'}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Connected Wallet Details */}
      {isConnected && publicKey ? (
        <div className="space-y-4">
          {/* Balance */}
          <BalanceDisplay />

          {/* Wallet Info Card */}
          <Card padding="lg">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    Freighter Wallet
                  </span>
                  <StatusDot status="online" />
                </div>
                <TruncatedKey publicKey={publicKey} prefix={10} suffix={6} className="text-sm" />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleRefresh}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-slate-800"
                  title="Refresh wallet info"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-slate-800"
                    title="View on Stellar Expert"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <EmptyState
          icon={<Wallet className="h-10 w-10" />}
          title={isFreighterInstalled ? 'No wallet connected' : 'Install Freighter to get started'}
          description={
            isFreighterInstalled
              ? 'Click "Connect Freighter" to link your Stellar wallet and start monitoring activity.'
              : 'Freighter is a browser extension wallet for Stellar. Install it to connect your wallet.'
          }
          action={
            isFreighterInstalled ? (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Freighter'}
              </button>
            ) : (
              <a
                href="https://freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Get Freighter
              </a>
            )
          }
        />
      )}

      {/* Tracked / monitored wallets with live balances (#5, #25, #49) */}
      <MonitoredWallets />

      {/* Transaction Modal */}
      <TransactionModal isOpen={showSendModal} onClose={() => setShowSendModal(false)} />
    </div>
  );
}
