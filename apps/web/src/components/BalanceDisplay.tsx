'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Horizon } from '@stellar/stellar-sdk';
import { useWallet } from '@/context/WalletContext';
import { Spinner, cn } from '@mizpah-pulse/ui';
import { Coins, RefreshCw, AlertCircle } from 'lucide-react';

interface BalanceDisplayProps {
  /** Show a compact version (smaller text) */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * BalanceDisplay — Fetches and displays the connected wallet's XLM balance
 *
 * Polls Horizon every 30 seconds for balance updates.
 * Shows loading spinner, error state, and formatted balance.
 */
export function BalanceDisplay({ compact, className }: BalanceDisplayProps) {
  const { publicKey, isConnected } = useWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !isConnected) return;

    setLoading(true);
    setError(null);

    try {
      const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await horizon.loadAccount(publicKey);

      // Find the native XLM balance
      const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
      if (nativeBalance) {
        const formatted = parseFloat(nativeBalance.balance).toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 7,
        });
        setBalance(formatted);
      } else {
        setBalance('0');
      }
    } catch (err) {
      // If the account isn't funded yet, show 0
      if (err instanceof Error && err.message?.includes('not_found')) {
        setBalance('0');
      } else {
        setError('Failed to fetch balance');
      }
    } finally {
      setLoading(false);
    }
  }, [publicKey, isConnected]);

  // Fetch on mount and when publicKey changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Poll every 30 seconds
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(fetchBalance, 30_000);
    return () => clearInterval(interval);
  }, [isConnected, fetchBalance]);

  if (!isConnected || !publicKey) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Coins className="h-4 w-4 text-amber-500" />
        {loading ? (
          <Spinner size="sm" />
        ) : error ? (
          <span className="text-xs text-red-500">{error}</span>
        ) : (
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {balance ?? '0'} XLM
          </span>
        )}
        <button
          onClick={fetchBalance}
          className="rounded p-0.5 text-slate-400 transition-colors hover:text-indigo-500"
          title="Refresh balance"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950">
            <Coins className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">XLM Balance</p>
            {loading ? (
              <Spinner size="sm" className="mt-1" />
            ) : error ? (
              <div className="mt-1 flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3" />
                {error}
              </div>
            ) : (
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {balance ?? '0'} <span className="text-sm font-normal text-slate-500">XLM</span>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={fetchBalance}
          disabled={loading}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-500 disabled:opacity-50 dark:hover:bg-slate-800"
          title="Refresh balance"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>
    </div>
  );
}
