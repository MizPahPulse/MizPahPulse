'use client';

import { useState, useCallback, useEffect } from 'react';
import { isConnected, requestAccess, getAddress } from '@stellar/freighter-api';

/**
 * Freighter wallet connection states
 */
export type FreighterState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * useFreighter — Hook for Freighter wallet integration on Stellar Testnet
 *
 * Provides:
 * - connect() — request wallet access, get public key
 * - disconnect() — clear wallet state
 * - isConnected — boolean connection status
 * - publicKey — the connected wallet's public key
 * - state — detailed connection state machine
 * - error — error message if connection failed
 */
export function useFreighter() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [state, setState] = useState<FreighterState>('idle');
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if Freighter extension is installed in the browser.
   * We check window.freighterApi because the npm package always resolves
   * at build time regardless of whether the browser extension exists.
   */
  const isFreighterInstalled = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return !!(window as unknown as Record<string, unknown>).freighterApi;
  }, []);

  // Lazily compute the installed flag once; the extension state cannot change
  // during a page session, so recomputing it on every render was wasted work.
  const [installed] = useState<boolean>(() => isFreighterInstalled());

  /**
   * Detect Freighter availability and auto-reconnect if previously connected
   */
  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    if (!installed) {
      setState('disconnected');
      return;
    }

    // Check if already connected (e.g. page refresh)
    const checkExistingConnection = async () => {
      try {
        const connected = await isConnected();
        if (connected) {
          const pk = (await getAddress()).address;
          setPublicKey(pk);
          setState('connected');
        }
      } catch {
        // Not connected — that's fine
      }
    };

    checkExistingConnection();
  }, [isFreighterInstalled]);

  /**
   * Connect to Freighter wallet
   *
   * 1. Check if Freighter is installed
   * 2. Request wallet access
   * 3. Retrieve public key
   */
  const connect = useCallback(async (): Promise<string | null> => {
    setState('connecting');
    setError(null);

    try {
      // Check if Freighter is installed
      if (!installed) {
        const msg =
          'Freighter wallet extension is not installed. Please install Freighter from https://freighter.app';
        setError(msg);
        setState('error');
        return null;
      }

      // Check if already connected
      const alreadyConnected = await isConnected();
      if (alreadyConnected) {
        const pk = (await getAddress()).address;
        setPublicKey(pk);
        setState('connected');
        return pk;
      }

      // Request access — this triggers the Freighter popup
      // In @stellar/freighter-api v3, requestAccess() returns { address: string }
      const result = await requestAccess();
      const pk = result.address;
      setPublicKey(pk);
      setState('connected');
      return pk;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to Freighter wallet';
      setError(message);
      setState('error');
      return null;
    }
  }, [isFreighterInstalled]);

  /**
   * Disconnect from Freighter wallet
   */
  const disconnect = useCallback(() => {
    setPublicKey(null);
    setState('disconnected');
    setError(null);
  }, []);

  /**
   * Refresh the public key (useful after reconnection)
   */
  const refresh = useCallback(async (): Promise<string | null> => {
    if (!installed) return null;

    try {
      const pk = (await getAddress()).address;
      setPublicKey(pk);
      setState('connected');
      return pk;
    } catch {
      return null;
    }
  }, [isFreighterInstalled]);

  return {
    connect,
    disconnect,
    refresh,
    publicKey,
    isConnected: state === 'connected',
    isConnecting: state === 'connecting',
    state,
    error,
    isFreighterInstalled: installed,
  };
}
