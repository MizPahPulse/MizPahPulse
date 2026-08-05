'use client';

import { useToast } from '@mizpah-pulse/ui';
import { useCallback } from 'react';

/**
 * Hook that provides common toast patterns for the app.
 * Wraps useToast with convenience methods for transaction lifecycles.
 */
export function useAppToast() {
  const { addToast } = useToast();

  const showTransactionPending = useCallback(
    (txType: string) => {
      addToast({
        type: 'info',
        title: `${txType} Pending`,
        message: 'Waiting for wallet confirmation...',
        duration: 0, // Don't auto-dismiss
      });
    },
    [addToast],
  );

  const showTransactionSuccess = useCallback(
    (txType: string, hash?: string) => {
      addToast({
        type: 'success',
        title: `${txType} Successful`,
        message: hash ? `TX: ${hash.slice(0, 12)}...${hash.slice(-6)}` : 'Transaction confirmed',
        duration: 8000,
      });
    },
    [addToast],
  );

  const showTransactionError = useCallback(
    (txType: string, error: string) => {
      addToast({
        type: 'error',
        title: `${txType} Failed`,
        message: error,
        duration: 10000,
      });
    },
    [addToast],
  );

  const showWalletConnected = useCallback(
    (address: string) => {
      addToast({
        type: 'success',
        title: 'Wallet Connected',
        message: `${address.slice(0, 6)}...${address.slice(-4)}`,
        duration: 3000,
      });
    },
    [addToast],
  );

  const showCopied = useCallback(() => {
    addToast({
      type: 'info',
      title: 'Copied to clipboard',
      duration: 2000,
    });
  }, [addToast]);

  return {
    showTransactionPending,
    showTransactionSuccess,
    showTransactionError,
    showWalletConnected,
    showCopied,
    addToast,
  };
}
