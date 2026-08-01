'use client';

import { useState, useCallback } from 'react';
import {
  Networks,
  TransactionBuilder,
  Asset,
  Operation,
  BASE_FEE,
  Memo,
  Server as HorizonServer,
} from '@stellar/stellar-sdk';
import { useWallet } from '@/context/WalletContext';

/**
 * Transaction sending state
 */
export type SendTransactionState = 'idle' | 'building' | 'signing' | 'submitting' | 'success' | 'error';

/**
 * Transaction result returned after a successful send
 */
export interface TransactionResult {
  /** Stellar transaction hash */
  hash: string;
  /** Explorer link to view the transaction */
  explorerUrl: string;
  /** Ledger sequence the transaction was included in */
  ledger: number;
}

/**
 * useSendTransaction — Hook for sending XLM transactions via Freighter wallet on Stellar Testnet
 *
 * Flow:
 * 1. Build transaction (Horizon account load + operations + memo)
 * 2. Sign with Freighter (triggers wallet popup)
 * 3. Submit to Stellar Testnet
 * 4. Return transaction hash and explorer link on success
 */
export function useSendTransaction() {
  const { publicKey, isConnected } = useWallet();
  const [state, setState] = useState<SendTransactionState>('idle');
  const [result, setResult] = useState<TransactionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Send XLM to a destination address on Stellar Testnet
   *
   * @param destination - Stellar public key of the recipient
   * @param amount - Amount of XLM to send (e.g. "10")
   * @param memo - Optional memo text (max 28 chars)
   * @returns TransactionResult on success, null on failure
   */
  const sendXlm = useCallback(
    async (destination: string, amount: string, memo?: string): Promise<TransactionResult | null> => {
      // Reset state
      setState('building');
      setResult(null);
      setError(null);

      try {
        // Validate wallet is connected
        if (!publicKey || !isConnected) {
          throw new Error('Wallet not connected. Please connect your Freighter wallet first.');
        }

        // Validate destination
        if (!destination || destination.length !== 56 || !destination.startsWith('G')) {
          throw new Error('Invalid destination address. Must be a valid Stellar public key starting with "G".');
        }

        // Validate amount
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new Error('Invalid amount. Must be a positive number.');
        }

        // Step 1: Build the transaction
        const horizonUrl = 'https://horizon-testnet.stellar.org';
        const horizon = new HorizonServer(horizonUrl);

        // Load source account from Horizon
        const sourceAccount = await horizon.loadAccount(publicKey);

        // Create the payment operation
        const paymentOp = Operation.payment({
          destination,
          asset: Asset.native(),
          amount: parsedAmount.toString(),
        });

        // Build the transaction with optional memo (memo MUST be added before building)
        let txBuilder = new TransactionBuilder(sourceAccount, {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(paymentOp)
          .setTimeout(30); // 30-second timeout

        // Add memo BEFORE building — this is critical for the memo to be included
        if (memo && memo.length > 0) {
          txBuilder = txBuilder.addMemo(new Memo(Memo.text, memo.slice(0, 28)));
        }

        const tx = txBuilder.build();

        // Step 2: Sign with Freighter
        setState('signing');

        if (typeof window === 'undefined') {
          throw new Error('Cannot sign transactions in server-side rendering.');
        }

        const freighter = (window as unknown as Record<string, unknown>).freighterApi as {
          signTransaction: (xdr: string, opts?: { network?: string; networkPassphrase?: string }) => Promise<string>;
        };

        if (!freighter) {
          throw new Error('Freighter wallet not found. Please install the Freighter extension.');
        }

        const signedXdr = await freighter.signTransaction(tx.toXDR(), {
          network: 'TESTNET',
          networkPassphrase: Networks.TESTNET,
        });

        // Step 3: Submit to network
        setState('submitting');

        const signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
        const submitResult = await horizon.submitTransaction(signedTx);

        const txResult: TransactionResult = {
          hash: submitResult.hash,
          explorerUrl: `https://stellar.expert/explorer/testnet/tx/${submitResult.hash}`,
          ledger: submitResult.ledger ?? 0,
        };

        setResult(txResult);
        setState('success');
        return txResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Transaction failed';
        setError(message);
        setState('error');
        return null;
      }
    },
    [publicKey, isConnected],
  );

  /**
   * Reset the transaction state back to idle
   */
  const reset = useCallback(() => {
    setState('idle');
    setResult(null);
    setError(null);
  }, []);

  return {
    sendXlm,
    reset,
    state,
    result,
    error,
    isSending: state === 'building' || state === 'signing' || state === 'submitting',
    isSuccess: state === 'success',
    isError: state === 'error',
  };
}
