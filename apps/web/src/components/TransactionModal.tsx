'use client';

import React, { useState, type FormEvent } from 'react';
import { useSendTransaction } from '@/hooks/useSendTransaction';
import { useWallet } from '@/context/WalletContext';
import { Spinner, cn } from '@mizpah-pulse/ui';
import {
  Send,
  X,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
} from 'lucide-react';

interface TransactionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close the modal */
  onClose: () => void;
}

/**
 * TransactionModal — Full-featured XLM send modal with the complete transaction lifecycle
 *
 * States:
 * - Form (destination, amount, memo)
 * - Signing (waiting for Freighter popup approval)
 * - Submitting (broadcasting to testnet)
 * - Success (transaction hash with explorer link)
 * - Error (error message with retry option)
 */
export function TransactionModal({ isOpen, onClose }: TransactionModalProps) {
  const { publicKey, isConnected } = useWallet();
  const { sendXlm, reset, state, result, error, isSending, isSuccess, isError } = useSendTransaction();

  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!destination || !amount) return;

    await sendXlm(destination, amount, memo || undefined);
  };

  const handleClose = () => {
    // Reset form state
    setDestination('');
    setAmount('');
    setMemo('');
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isSending ? undefined : handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-md animate-slide-up rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950">
              <Send className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Send XLM</h2>
          </div>
          {!isSending && (
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
          {/* Connected wallet indicator */}
          <div className="mb-4 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900">
            <p className="text-slate-500 dark:text-slate-400">From</p>
            <p className="mt-0.5 font-mono text-slate-700 dark:text-slate-300">
              {publicKey ? `${publicKey.slice(0, 8)}...${publicKey.slice(-6)}` : 'Not connected'}
            </p>
          </div>

          {/* Success State */}
          {isSuccess && result && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
                  Transaction Sent!
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {amount} XLM sent successfully
                </p>
              </div>

              {/* Transaction details */}
              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Transaction Hash</p>
                  <p className="mt-0.5 break-all font-mono text-xs text-slate-700 dark:text-slate-300">
                    {result.hash}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ledger</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                    #{result.ledger}
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

          {/* Error State */}
          {isError && error && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-red-700 dark:text-red-400">
                  Transaction Failed
                </h3>
                <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                  {error}
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
          {isSending && (
            <div className="flex flex-col items-center py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {state === 'signing' ? 'Waiting for Approval' : 'Sending Transaction'}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {state === 'signing'
                  ? 'Please approve the transaction in your Freighter wallet...'
                  : 'Broadcasting transaction to Stellar Testnet...'}
              </p>
            </div>
          )}

          {/* Form State */}
          {!isSending && !isSuccess && !isError && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Destination */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Destination Address
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="GABC..."
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Amount (XLM)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="10"
                    min="1"
                    step="0.1"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-14 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                    XLM
                  </span>
                </div>
              </div>

              {/* Memo (optional) */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Memo <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Payment for..."
                  maxLength={28}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <p className="mt-1 text-[10px] text-slate-400">{memo.length}/28 characters</p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!destination || !amount || !isConnected}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Send XLM
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
