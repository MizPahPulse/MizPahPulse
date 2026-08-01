'use client';

import { useState, useCallback } from 'react';
import {
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Horizon,
  rpc,
  xdr,
  Contract,
  scValToNative,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { useWallet } from '@/context/WalletContext';

/**
 * Contract invocation states
 */
export type InvokeState = 'idle' | 'building' | 'signing' | 'submitting' | 'success' | 'error';

/**
 * Result from a successful contract invocation
 */
export interface InvokeResult {
  /** Transaction hash on Stellar */
  hash: string;
  /** Explorer link */
  explorerUrl: string;
  /** Return value from the contract call */
  returnValue: unknown;
}

/**
 * useContractInvoke — Hook for calling Soroban smart contract functions via Freighter wallet
 *
 * Flow:
 * 1. Build contract invocation transaction
 * 2. Simulate to get fee and result
 * 3. Sign with Freighter
 * 4. Submit to Stellar Testnet
 * 5. Display transaction result with return value
 */
export function useContractInvoke(contractId: string) {
  const { publicKey, isConnected } = useWallet();
  const [state, setState] = useState<InvokeState>('idle');
  const [result, setResult] = useState<InvokeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Invoke a contract function and return the result
   *
   * @param functionName - Name of the Soroban function to call (e.g. "pulse")
   * @param args - Arguments to pass to the function (symbol strings for the caller)
   * @returns InvokeResult with tx hash and return value, or null on failure
   */
  const invoke = useCallback(
    async (functionName: string, args: string[]): Promise<InvokeResult | null> => {
      setState('building');
      setResult(null);
      setError(null);

      try {
        // Validate wallet
        if (!publicKey || !isConnected) {
          throw new Error('WALLET_NOT_CONNECTED: Please connect your Freighter wallet first.');
        }

        // Validate contract ID
        if (!contractId || contractId.length !== 56 || !contractId.startsWith('C')) {
          throw new Error('INVALID_CONTRACT: The contract ID is invalid. Must start with "C" and be 56 characters.');
        }

        const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');
        const sorobanRpc = new rpc.Server('https://soroban-rpc.testnet.stellar.org');

        // Load source account
        const sourceAccount = await horizon.loadAccount(publicKey);

        // Build the contract invocation
        const contract = new Contract(contractId);

        // Build function call args
        const callArgs = args.map((arg) => xdr.ScVal.scvSymbol(arg));
        const callOp = contract.call(functionName, ...callArgs);

        // Build transaction
        const tx = new TransactionBuilder(sourceAccount, {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(callOp)
          .setTimeout(30)
          .build();

        // Simulate to get accurate fees and validate
        const simResponse = await sorobanRpc.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(simResponse)) {
          throw new Error(
            `CONTRACT_ERROR: Simulation failed — ${simResponse.error}`,
          );
        }

        const assembledTx = rpc.assembleTransaction(tx, simResponse).build();

        // Sign with Freighter
        setState('signing');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const signedXdr = await signTransaction(assembledTx.toXDR(), { network: 'TESTNET' } as any);

        // Submit to network
        setState('submitting');

        const signedTx = TransactionBuilder.fromXDR(signedXdr.signedTxXdr, Networks.TESTNET);
        const submitResult = await horizon.submitTransaction(signedTx);

        // Extract return value if available from the simulation
        let returnValue: unknown = null;
        if (simResponse.result?.retval) {
          try {
            returnValue = scValToNative(simResponse.result.retval);
          } catch {
            returnValue = 'Could not decode return value';
          }
        }

        const invokeResult: InvokeResult = {
          hash: submitResult.hash,
          explorerUrl: `https://stellar.expert/explorer/testnet/tx/${submitResult.hash}`,
          returnValue,
        };

        setResult(invokeResult);
        setState('success');
        return invokeResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'TRANSACTION_FAILED: Contract invocation failed';
        setError(message);
        setState('error');
        return null;
      }
    },
    [publicKey, isConnected, contractId],
  );

  /**
   * Read-only call: invoke without submitting (simulate only).
   * Requires wallet connection to load source account for simulation.
   */
  const readOnly = useCallback(
    async (functionName: string): Promise<unknown> => {
      if (!publicKey) return null;

      try {
        const sorobanRpc = new rpc.Server('https://soroban-rpc.testnet.stellar.org');
        const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');
        const contract = new Contract(contractId);

        const sourceAccount = await horizon.loadAccount(publicKey);

        const tx = new TransactionBuilder(sourceAccount, {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(contract.call(functionName))
          .setTimeout(30)
          .build();

        const simResponse = await sorobanRpc.simulateTransaction(tx);

        if (rpc.Api.isSimulationError(simResponse)) {
          return null;
        }

        return simResponse.result?.retval
          ? scValToNative(simResponse.result.retval)
          : null;
      } catch {
        return null;
      }
    },
    [contractId, publicKey],
  );

  const reset = useCallback(() => {
    setState('idle');
    setResult(null);
    setError(null);
  }, []);

  return {
    invoke,
    readOnly,
    reset,
    state,
    result,
    error,
    isInvoking: state === 'building' || state === 'signing' || state === 'submitting',
    isSuccess: state === 'success',
    isError: state === 'error',
  };
}
