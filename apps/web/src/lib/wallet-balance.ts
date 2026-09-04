/**
 * Native (XLM) balance helpers for the monitored-wallets list (issue #25).
 *
 * The loader boundary is injectable so the Horizon client never needs to be
 * constructed or reached inside unit tests — `createHorizonBalanceLoader`
 * wires the real @stellar/stellar-sdk server for runtime use.
 */
import { Horizon } from '@stellar/stellar-sdk';

export interface AccountBalance {
  asset_type: string;
  balance: string;
  [key: string]: unknown;
}

export interface BalanceLoader {
  /** Load an account and return its balances. */
  loadAccount(publicKey: string): Promise<{ balances: AccountBalance[] }>;
}

export const NATIVE_ASSET_TYPE = 'native';

/**
 * Extract the native XLM balance from a loaded account. Returns `'0'` when the
 * account exists but holds no native balance, and rejects with the original
 * error when the account cannot be loaded (e.g. Horizon is unreachable) so the
 * caller can render a graceful failure state.
 */
export async function getNativeXlmBalance(
  publicKey: string,
  loader: BalanceLoader,
): Promise<string> {
  const account = await loader.loadAccount(publicKey);
  const native = account.balances.find((b) => b.asset_type === NATIVE_ASSET_TYPE);
  return native ? native.balance : '0';
}

/** Format a raw stellar balance string for display (max 7 decimals, no exponent). */
export function formatXlmBalance(rawBalance: string): string {
  const value = parseFloat(rawBalance);
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  });
}

/** Default loader backed by a real Horizon server for the given network. */
export function createHorizonBalanceLoader(horizonUrl: string): BalanceLoader {
  const server = new Horizon.Server(horizonUrl);
  return {
    async loadAccount(publicKey: string) {
      const account = await server.loadAccount(publicKey);
      // Horizon's AccountResponse balances are a union of rich balance-line
      // types; the loader contract only needs the common fields.
      return { balances: account.balances as unknown as AccountBalance[] };
    },
  };
}
