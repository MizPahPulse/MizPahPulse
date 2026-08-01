import { Keypair, StrKey, TransactionBuilder } from '@stellar/stellar-sdk';
import { getNetworkConfig } from './config';
import type { StellarNetwork } from '@mizpah-pulse/types';

/**
 * Validate a Stellar public key
 */
export function isValidPublicKey(key: string): boolean {
  try {
    return StrKey.isValidEd25519PublicKey(key);
  } catch {
    return false;
  }
}

/**
 * Validate a Stellar secret key
 */
export function isValidSecretKey(key: string): boolean {
  try {
    return StrKey.isValidEd25519SecretSeed(key);
  } catch {
    return false;
  }
}

/**
 * Validate a Stellar contract ID
 */
export function isValidContractId(id: string): boolean {
  try {
    return StrKey.isValidContract(id);
  } catch {
    return false;
  }
}

/**
 * Validate a transaction hash
 */
export function isValidTransactionHash(hash: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Generate a new Stellar keypair
 */
export function generateKeypair() {
  return Keypair.random();
}

/**
 * Format a public key for display (truncated)
 */
export function formatPublicKey(key: string, prefix = 4, suffix = 4): string {
  if (key.length <= prefix + suffix + 3) return key;
  return `${key.slice(0, prefix)}...${key.slice(-suffix)}`;
}

/**
 * Create an explorer URL for a transaction
 */
export function getExplorerTxUrl(hash: string, network?: StellarNetwork): string {
  const config = getNetworkConfig(network);
  const base = config.isTestnet
    ? 'https://stellar.expert/explorer/testnet/tx/'
    : 'https://stellar.expert/explorer/public/tx/';
  return `${base}${hash}`;
}

/**
 * Create an explorer URL for an account
 */
export function getExplorerAccountUrl(publicKey: string, network?: StellarNetwork): string {
  const config = getNetworkConfig(network);
  const base = config.isTestnet
    ? 'https://stellar.expert/explorer/testnet/account/'
    : 'https://stellar.expert/explorer/public/account/';
  return `${base}${publicKey}`;
}

/**
 * Create Stellar-compliant memo text (truncates to 28 bytes)
 */
export function createMemoText(text: string): string {
  return text.slice(0, 28);
}

/**
 * Convert stroops to XLM
 */
export function stroopsToXlm(stroops: string | number): string {
  const amount = typeof stroops === 'string' ? BigInt(stroops) : BigInt(stroops);
  return (Number(amount) / 10_000_000).toFixed(7);
}

/**
 * Convert XLM to stroops
 */
export function xlmToStroops(xlm: string | number): string {
  return (Math.round(Number(xlm) * 10_000_000)).toString();
}
