'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { useWallet } from '@/context/WalletContext';
import { useInterval } from '@/hooks/use-interval';
import {
  getNativeXlmBalance,
  formatXlmBalance,
  createHorizonBalanceLoader,
  type BalanceLoader,
} from '@/lib/wallet-balance';
import { getNetworkConfig } from '@mizpah-pulse/stellar';
import { Card, EmptyState, Spinner, TruncatedKey, cn } from '@mizpah-pulse/ui';
import { Wallet, Radar, Plus, RefreshCw, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';

/** Shape returned by GET /api/v1/wallets (one row per monitored wallet). */
export interface MonitoredWalletRow {
  id: string;
  publicKey: string;
  label: string | null;
  network: string;
  isActive: boolean;
  notificationEnabled: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
}

const BALANCE_REFRESH_MS = 30_000;

function explorerUrl(publicKey: string, network: string) {
  const net = network === 'PUBLIC' ? 'public' : 'testnet';
  return `https://stellar.expert/explorer/${net}/account/${publicKey}`;
}

interface WalletBalanceProps {
  wallet: MonitoredWalletRow;
  loader: BalanceLoader;
  refreshMs: number;
}

/**
 * Live XLM balance for a single monitored wallet (issue #25): refreshes every
 * 30s with a visible "updating" state and degrades gracefully when Horizon is
 * unreachable (the row keeps its last value and shows a retryable message).
 */
function WalletBalance({ wallet, loader, refreshMs }: WalletBalanceProps) {
  const [balance, setBalance] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [hasLoaded, setHasLoaded] = useState(false);

  const refresh = useCallback(async () => {
    setStatus('loading');
    try {
      const raw = await getNativeXlmBalance(wallet.publicKey, loader);
      setBalance(raw);
      setStatus('ready');
    } catch {
      // Keep the last known balance when one exists; otherwise mark the row
      // as failed so the user can retry (Horizon may be down).
      setStatus('error');
    } finally {
      setHasLoaded(true);
    }
  }, [wallet.publicKey, loader]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useInterval(refresh, hasLoaded ? refreshMs : null);

  return (
    <div className="flex items-center gap-2">
      {status === 'loading' ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
          <span className="text-sm text-slate-400">Updating balance…</span>
        </>
      ) : status === 'error' ? (
        <>
          <AlertCircle className="h-4 w-4 text-red-400" aria-hidden="true" />
          <button
            onClick={refresh}
            className="text-sm text-red-500 underline-offset-2 hover:underline"
            title="Horizon is unreachable — click to retry"
          >
            Balance unavailable — retry
          </button>
        </>
      ) : (
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {formatXlmBalance(balance ?? '0')}{' '}
          <span className="text-sm font-normal text-slate-500">XLM</span>
        </p>
      )}
    </div>
  );
}

export interface MonitoredWalletsProps {
  /** Horizon-backed loader; injectable for tests. */
  loader?: BalanceLoader;
  /** Balance auto-refresh interval (default 30s). */
  balanceRefreshMs?: number;
}

/**
 * "Monitored wallets" section of the wallets page.
 *
 * Lists the wallets the current user tracks (GET /api/v1/wallets), shows a
 * live XLM balance per row that auto-refreshes every 30 seconds, and renders a
 * helpful empty state with a call-to-action when no wallets are tracked yet
 * (issue #5, #25). The `lastSyncedAt` value is surfaced by the ingester
 * (issue #49).
 */
export function MonitoredWallets({
  loader,
  balanceRefreshMs = BALANCE_REFRESH_MS,
}: MonitoredWalletsProps) {
  const { publicKey, isConnected } = useWallet();
  const [wallets, setWallets] = useState<MonitoredWalletRow[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const balanceLoader = useMemo(
    () =>
      loader ??
      createHorizonBalanceLoader(
        getNetworkConfig(
          (process.env.NEXT_PUBLIC_STELLAR_NETWORK as 'TESTNET' | 'PUBLIC') || 'TESTNET',
        ).horizonUrl,
      ),
    [loader],
  );

  const loadWallets = useCallback(async () => {
    try {
      const data = await apiFetch<{ data: MonitoredWalletRow[] }>('/api/v1/wallets');
      setWallets(data.data);
      setListError(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load monitored wallets');
    }
  }, []);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  // Track the connected Freighter wallet so it appears in the monitored list.
  const trackConnectedWallet = useCallback(async () => {
    if (!publicKey) return;
    setTracking(true);
    setActionMessage(null);
    try {
      await apiFetch<MonitoredWalletRow>('/api/v1/wallets', {
        method: 'POST',
        body: { publicKey },
      });
      setActionMessage('Wallet added to monitoring.');
      await loadWallets();
    } catch (err) {
      setActionMessage(
        err instanceof ApiClientError ? err.message : 'Failed to add wallet for monitoring',
      );
    } finally {
      setTracking(false);
    }
  }, [publicKey, loadWallets]);

  const alreadyTrackingConnected = useMemo(
    () => Boolean(publicKey && wallets?.some((w) => w.publicKey === publicKey)),
    [publicKey, wallets],
  );

  const isLoading = wallets === null && !listError;

  return (
    <section aria-label="Monitored wallets" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Monitored Wallets
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Wallets tracked for activity. Balances refresh automatically.
          </p>
        </div>
        <button
          onClick={loadWallets}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-slate-800"
          title="Refresh wallet list"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {listError ? (
        <Card padding="md" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{listError}</p>
            <button
              onClick={loadWallets}
              className="ml-auto rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200"
            >
              Retry
            </button>
          </div>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : wallets && wallets.length === 0 ? (
        // When nothing is tracked yet, the empty state only makes sense for a
        // user who can act on it (i.e. has Freighter connected). Disconnected
        // visitors already see the page-level “Connect Freighter” empty state.
        !isConnected ? null : (
          <Card padding="lg">
            <EmptyState
              icon={<Radar className="h-10 w-10" />}
              title="No monitored wallets yet"
              description="Track your connected wallet to start seeing its live balance and on-chain activity here."
              action={
                <button
                  onClick={trackConnectedWallet}
                  disabled={tracking || alreadyTrackingConnected}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tracking ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {alreadyTrackingConnected
                    ? 'Connected wallet is monitored'
                    : tracking
                      ? 'Adding wallet…'
                      : 'Track this wallet'}
                </button>
              }
            />
            {actionMessage && (
              <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                {actionMessage}
              </p>
            )}
          </Card>
        )
      ) : (
        <div className="space-y-3">
          {actionMessage && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{actionMessage}</p>
          )}
          {wallets?.map((wallet) => (
            <Card key={wallet.id} padding="md">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                        {wallet.label || 'Monitored wallet'}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                          wallet.network === 'PUBLIC'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
                        )}
                      >
                        {wallet.network}
                      </span>
                    </div>
                    <TruncatedKey
                      publicKey={wallet.publicKey}
                      prefix={8}
                      suffix={6}
                      className="text-xs"
                    />
                    <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                      {wallet.lastSyncedAt
                        ? `Last activity synced ${new Date(wallet.lastSyncedAt).toLocaleString()}`
                        : 'Waiting for on-chain activity…'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <WalletBalance
                    wallet={wallet}
                    loader={balanceLoader}
                    refreshMs={balanceRefreshMs}
                  />
                  <a
                    href={explorerUrl(wallet.publicKey, wallet.network)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-slate-800"
                    title="View on Stellar Expert"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
