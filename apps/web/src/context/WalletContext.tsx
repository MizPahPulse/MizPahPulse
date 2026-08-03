'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useFreighter, type FreighterState } from '@/hooks/useFreighter';

/**
 * Wallet context value exposed to the entire app
 */
interface WalletContextValue {
  /** The connected wallet's Stellar public key (null if not connected) */
  publicKey: string | null;
  /** Whether a Freighter wallet is currently connected */
  isConnected: boolean;
  /** Whether a connection attempt is in progress */
  isConnecting: boolean;
  /** Detailed connection state machine */
  state: FreighterState;
  /** Error message if connection failed */
  error: string | null;
  /** Whether Freighter extension is installed in the browser */
  isFreighterInstalled: boolean;
  /** Connect to Freighter wallet (triggers popup) */
  connect: () => Promise<string | null>;
  /** Disconnect the current wallet */
  disconnect: () => void;
  /** Refresh the public key (e.g. after page refresh) */
  refresh: () => Promise<string | null>;
  /** Incrementing key that changes when a transaction completes — triggers balance refresh */
  balanceRefreshKey: number;
  /** Trigger a balance refresh (increments balanceRefreshKey) */
  triggerBalanceRefresh: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/**
 * WalletProvider — Provides global wallet state from Freighter integration
 *
 * Usage:
 * ```tsx
 * <WalletProvider>
 *   <App />
 * </WalletProvider>
 * ```
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useFreighter();
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);

  const triggerBalanceRefresh = useCallback(() => {
    setBalanceRefreshKey((k) => k + 1);
  }, []);

  return (
    <WalletContext.Provider value={{ ...wallet, balanceRefreshKey, triggerBalanceRefresh }}>
      {children}
    </WalletContext.Provider>
  );
}

/**
 * useWallet — Access the global wallet context
 *
 * Throws if used outside of <WalletProvider>
 */
export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a <WalletProvider>');
  }
  return context;
}
