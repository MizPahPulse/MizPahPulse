import { SorobanRpc, xdr, Contract, Address } from '@stellar/stellar-sdk';
import { getNetworkConfig } from './config';
import type { StellarNetwork } from '@mizpah-pulse/types';

/**
 * Create a Soroban RPC client
 */
export function createSorobanRpc(network?: StellarNetwork): SorobanRpc.Server {
  const config = getNetworkConfig(network);
  return new SorobanRpc.Server(config.sorobanRpcUrl);
}

let _defaultRpc: SorobanRpc.Server | null = null;

export function getSorobanRpc(): SorobanRpc.Server {
  if (!_defaultRpc) {
    _defaultRpc = createSorobanRpc();
  }
  return _defaultRpc;
}

/**
 * Get the latest ledger from Soroban RPC
 */
export async function getLatestLedger() {
  const rpc = getSorobanRpc();
  return rpc.getLatestLedger();
}

/**
 * Get transaction details from Soroban RPC
 */
export async function getTransaction(hash: string) {
  const rpc = getSorobanRpc();
  return rpc.getTransaction(hash);
}

/**
 * Get events from Soroban RPC
 */
export async function getEvents(request: SorobanRpc.Api.GetEventsRequest) {
  const rpc = getSorobanRpc();
  return rpc.getEvents(request);
}

/**
 * Stream Soroban events using polling
 */
export async function pollSorobanEvents(
  startLedger: number,
  onEvents: (events: SorobanRpc.Api.GetEventsResponse) => void,
  options?: {
    intervalMs?: number;
    contractIds?: string[];
    topics?: string[][];
    maxRetries?: number;
  },
) {
  const rpc = getSorobanRpc();
  const intervalMs = options?.intervalMs ?? 5000;
  const maxRetries = options?.maxRetries ?? 3;
  let currentLedger = startLedger;
  let retries = 0;
  let timer: ReturnType<typeof setInterval>;

  const poll = async () => {
    try {
      const response = await rpc.getEvents({
        startLedger: currentLedger,
        filters: [
          {
            type: 'contract',
            contractIds: options?.contractIds,
            topics: options?.topics,
          },
        ],
        limit: 100,
      });

      if (response.events && response.events.length > 0) {
        onEvents(response);

        // Update cursor to the latest ledger
        const maxLedger = Math.max(...response.events.map((e) => e.ledger));
        if (maxLedger >= currentLedger) {
          currentLedger = maxLedger + 1;
        }
      }

      retries = 0;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        clearInterval(timer);
        throw error;
      }
    }
  };

  // Initial poll
  await poll();

  timer = setInterval(poll, intervalMs);

  return () => clearInterval(timer);
}

/**
 * Simulate a Soroban transaction
 */
export async function simulateTransaction(transaction: string) {
  const rpc = getSorobanRpc();
  return rpc.simulateTransaction(new SorobanRpc.Api.SimulateTransactionRequest(transaction));
}

/**
 * Parse a contract event from XDR
 */
export function parseContractEvent(eventXdr: string) {
  try {
    return xdr.ContractEvent.fromXDR(eventXdr, 'base64');
  } catch {
    return null;
  }
}

/**
 * Create a Contract instance for interacting with Soroban contracts
 */
export function getContract(contractId: string) {
  const rpc = getSorobanRpc();
  return new Contract(contractId);
}

/**
 * Encode a Stellar address for contract use
 */
export function encodeContractAddress(publicKey: string): string {
  return Address.fromString(publicKey).toScAddress().toXDR('base64');
}
