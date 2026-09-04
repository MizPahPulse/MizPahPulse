'use client';

import { useState, useCallback, useMemo } from 'react';
import {
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
import { useToast } from '@mizpah-pulse/ui';
import { getNetworkConfig, getExplorerTxUrl, type StellarNetwork } from '@mizpah-pulse/stellar';

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
  const { addToast } = useToast();
  const [state, setState] = useState<InvokeState>('idle');
  const [result, setResult] = useState<InvokeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use environment-configured network instead of hardcoded URLs
  const networkConfig = useMemo(() => {
    const network = (process.env.NEXT_PUBLIC_STELLAR_NETWORK as StellarNetwork) || 'TESTNET';
    return getNetworkConfig(network);
  }, []);

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
          throw new Error(
            'INVALID_CONTRACT: The contract ID is invalid. Must start with "C" and be 56 characters.',
          );
        }

        const horizon = new Horizon.Server(networkConfig.horizonUrl);
        const sorobanRpc = new rpc.Server(networkConfig.sorobanRpcUrl);

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
          networkPassphrase: networkConfig.networkPassphrase,
        })
          .addOperation(callOp)
          .setTimeout(30)
          .build();

        // Simulate to get accurate fees and validate
        const simResponse = await sorobanRpc.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(simResponse)) {
          throw new Error(`CONTRACT_ERROR: Simulation failed — ${simResponse.error}`);
        }

        const assembledTx = rpc.assembleTransaction(tx, simResponse).build();

        // Sign with Freighter
        setState('signing');

        const signedXdr = await signTransaction(assembledTx.toXDR(), {
          networkPassphrase: networkConfig.networkPassphrase,
        });

        // Submit to network
        setState('submitting');

        const signedTx = TransactionBuilder.fromXDR(
          signedXdr.signedTxXdr,
          networkConfig.networkPassphrase,
        );
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
          explorerUrl: getExplorerTxUrl(submitResult.hash, networkConfig.network),
          returnValue,
        };

        setResult(invokeResult);
        setState('success');
        addToast({
          type: 'success',
          title: 'Contract invocation succeeded',
          message: `${invokeResult.hash.slice(0, 12)}… confirmed on ledger`,
          href: invokeResult.explorerUrl,
          actionLabel: 'View on explorer',
          duration: 8000,
        });
        return invokeResult;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'TRANSACTION_FAILED: Contract invocation failed';
        setError(message);
        setState('error');
        addToast({
          type: 'error',
          title: 'Contract invocation failed',
          message,
          duration: 8000,
        });
        return null;
      }
    },
    [publicKey, isConnected, contractId, networkConfig, addToast],
  );

  /**
   * Read-only call: invoke without submitting (simulate only).
   * Requires wallet connection to load source account for simulation.
   */
  const readOnly = useCallback(
    async (functionName: string): Promise<unknown> => {
      if (!publicKey) return null;

      try {
        // Use the environment-configured network instead of hardcoded Testnet URLs
        const sorobanRpc = new rpc.Server(networkConfig.sorobanRpcUrl);
        const horizon = new Horizon.Server(networkConfig.horizonUrl);
        const contract = new Contract(contractId);

        const sourceAccount = await horizon.loadAccount(publicKey);

        const tx = new TransactionBuilder(sourceAccount, {
          fee: BASE_FEE,
          networkPassphrase: networkConfig.networkPassphrase,
        })
          .addOperation(contract.call(functionName))
          .setTimeout(30)
          .build();

        const simResponse = await sorobanRpc.simulateTransaction(tx);

        if (rpc.Api.isSimulationError(simResponse)) {
          return null;
        }

        return simResponse.result?.retval ? scValToNative(simResponse.result.retval) : null;
      } catch {
        return null;
      }
    },
    [contractId, publicKey, networkConfig],
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
