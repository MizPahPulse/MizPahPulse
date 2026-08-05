'use client';

import React, { useState, type FormEvent } from 'react';
import { useContractInvoke } from '@/hooks/useContractInvoke';
import { useWallet } from '@/context/WalletContext';
import { cn } from '@mizpah-pulse/ui';
import { Zap, X, CheckCircle, AlertTriangle, ExternalLink, Loader2, FileCode } from 'lucide-react';

interface ContractInvokeModalProps {
  /** The deployed contract ID on Stellar Testnet */
  contractId: string;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close the modal */
  onClose: () => void;
}

/**
 * ContractInvokeModal — Full-featured contract invocation modal
 *
 * States:
 * - Form (function selector, caller name input)
 * - Signing (waiting for Freighter approval)
 * - Submitting (broadcasting to testnet)
 * - Success (tx hash + explorer link + return value)
 * - Error (3 error types: validation, connection, contract error)
 */
export function ContractInvokeModal({ contractId, isOpen, onClose }: ContractInvokeModalProps) {
  const { publicKey, isConnected, triggerBalanceRefresh } = useWallet();
  const { invoke, readOnly, reset, state, result, error, isInvoking, isSuccess, isError } =
    useContractInvoke(contractId);

  const [callerName, setCallerName] = useState('');
  const [currentCount, setCurrentCount] = useState<number | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!callerName) return;

    const invokeResult = await invoke('pulse', [callerName]);
    if (invokeResult) {
      triggerBalanceRefresh();
    }
  };

  const handleReadCount = async () => {
    const count = await readOnly('get_pulse_count');
    if (typeof count === 'number') {
      setCurrentCount(count);
    }
  };

  const handleClose = () => {
    setCallerName('');
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isInvoking ? undefined : handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-md animate-slide-up rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950">
              <FileCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Call Contract
            </h2>
          </div>
          {!isInvoking && (
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Contract info */}
          <div className="mb-4 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900">
            <p className="text-slate-500 dark:text-slate-400">Contract</p>
            <p className="mt-0.5 font-mono text-slate-700 dark:text-slate-300">
              {contractId.slice(0, 12)}...{contractId.slice(-8)}
            </p>
            {currentCount !== null && (
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Current count: <span className="font-bold text-indigo-600">{currentCount}</span>
              </p>
            )}
          </div>

          {/* Success State */}
          {isSuccess && result && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
                  Contract Called!
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  pulse() executed successfully
                </p>
                {result.returnValue !== null && (
                  <p className="mt-1 text-lg font-bold text-indigo-600">
                    Returned: {String(result.returnValue)}
                  </p>
                )}
              </div>

              {/* Transaction details */}
              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Transaction Hash</p>
                  <p className="mt-0.5 break-all font-mono text-xs text-slate-700 dark:text-slate-300">
                    {result.hash}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={result.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Explorer
                </a>
                <button
                  onClick={handleClose}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Error State (3 types: validation, connection, contract) */}
          {isError && error && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-red-700 dark:text-red-400">
                  {error.startsWith('WALLET_NOT_CONNECTED')
                    ? 'Wallet Not Connected'
                    : error.startsWith('INVALID_CONTRACT')
                      ? 'Invalid Contract'
                      : error.startsWith('CONTRACT_ERROR')
                        ? 'Contract Error'
                        : 'Transaction Failed'}
                </h3>
                <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                  {error.replace(
                    /^(WALLET_NOT_CONNECTED|INVALID_CONTRACT|CONTRACT_ERROR|TRANSACTION_FAILED):\s*/,
                    '',
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={reset}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Signing/Submitting State */}
          {isInvoking && (
            <div className="flex flex-col items-center py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {state === 'signing' ? 'Waiting for Approval' : 'Invoking Contract'}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {state === 'signing'
                  ? 'Please approve the contract call in your Freighter wallet...'
                  : 'Broadcasting invocation to Stellar Testnet...'}
              </p>
            </div>
          )}

          {/* Form State */}
          {!isInvoking && !isSuccess && !isError && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Function display */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Function
                </label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400">
                  pulse(caller: Symbol) → u32
                </div>
              </div>

              {/* Caller name */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Caller Name
                </label>
                <input
                  type="text"
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  placeholder="alice"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleReadCount}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Zap className="h-4 w-4" />
                  Read Count
                </button>
                <button
                  type="submit"
                  disabled={!callerName || !isConnected}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileCode className="h-4 w-4" />
                  Call pulse()
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
