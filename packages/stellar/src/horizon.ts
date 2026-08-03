import { Horizon } from '@stellar/stellar-sdk';
import { getNetworkConfig } from './config';
import type { StellarNetwork } from '@mizpah-pulse/types';

/**
 * Create a Horizon server instance
 */
export function createHorizonServer(network?: StellarNetwork): Horizon.Server {
  const config = getNetworkConfig(network);
  return new Horizon.Server(config.horizonUrl);
}

/**
 * Default Horizon server instance
 */
let _defaultHorizon: Horizon.Server | null = null;

export function getHorizonServer(): Horizon.Server {
  if (!_defaultHorizon) {
    _defaultHorizon = createHorizonServer();
  }
  return _defaultHorizon;
}

/**
 * Fetch account details from Horizon
 */
export async function fetchAccount(publicKey: string, network?: StellarNetwork) {
  const server = network ? createHorizonServer(network) : getHorizonServer();
  return server.loadAccount(publicKey);
}

/**
 * Fetch transactions for an account
 */
export async function fetchAccountTransactions(
  publicKey: string,
  options?: { limit?: number; cursor?: string; order?: 'asc' | 'desc' },
) {
  const server = getHorizonServer();
  return server
    .transactions()
    .forAccount(publicKey)
    .limit(options?.limit ?? 50)
    .cursor(options?.cursor ?? '')
    .order(options?.order ?? 'desc')
    .call();
}

/**
 * Fetch payments for an account
 */
export async function fetchAccountPayments(
  publicKey: string,
  options?: { limit?: number; cursor?: string; order?: 'asc' | 'desc' },
) {
  const server = getHorizonServer();
  return server
    .payments()
    .forAccount(publicKey)
    .limit(options?.limit ?? 50)
    .cursor(options?.cursor ?? '')
    .order(options?.order ?? 'desc')
    .call();
}

/**
 * Fetch a single transaction by hash
 */
export async function fetchTransaction(hash: string) {
  const server = getHorizonServer();
  return server.transactions().transaction(hash).call();
}

/**
 * Fetch operations for a transaction
 */
export async function fetchTransactionOperations(hash: string) {
  const server = getHorizonServer();
  return server.operations().forTransaction(hash).call();
}

/**
 * Fetch all assets on the network
 */
export async function fetchAssets(
  options?: { limit?: number; cursor?: string },
): Promise<Horizon.ServerApi.CollectionPage<Horizon.ServerApi.AssetRecord>> {
  const server = getHorizonServer();
  return server
    .assets()
    .limit(options?.limit ?? 200)
    .cursor(options?.cursor ?? '')
    .call();
}

/**
 * Fetch current ledger sequence
 */
export async function fetchLatestLedger() {
  const server = getHorizonServer();
  return server.ledgers().order('desc').limit(1).call();
}

/**
 * Stream Horizon events using SSE
 */
export function streamHorizonEvents(
  cursor: string | 'now',
  onEvent: (event: Horizon.ServerApi.TransactionRecord) => void,
  onError?: (error: Error) => void,
) {
  const server = getHorizonServer();
  const builder = server.transactions().cursor(cursor);

  const close = builder.stream({
    onmessage: (tx) => onEvent(tx),
    onerror: (err) => onError?.(err as unknown as Error),
  });

  return close;
}
