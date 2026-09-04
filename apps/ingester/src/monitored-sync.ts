/**
 * Monitored-wallet sync tracking for the ingester (issue #49).
 *
 * MonitoredWallet.lastSyncedAt is a user-facing "is this wallet still being
 * watched?" signal, but nothing ever updated it. This module updates it
 * whenever the ingester processes an event involving a monitored wallet,
 * with two guards against excessive writes:
 *
 *  1. The set of monitored public keys is loaded once and refreshed on an
 *     interval (`publicKeyReloadMs`, default 60s) instead of querying the
 *     database for every event.
 *  2. Each wallet's `lastSyncedAt` is written at most once per
 *     `writeIntervalMs` (default 60s), so a burst of events for one wallet
 *     collapses into a single write.
 *
 * The DB surface is injected so the module is unit-testable without a live
 * database (see monitored-sync.test.ts).
 */

export interface MonitoredSyncDb {
  monitoredWallet: {
    findMany(args: {
      where: Record<string, unknown>;
      select?: { id?: boolean; publicKey?: boolean };
    }): Promise<Array<{ id: string; publicKey: string }>>;
    update(args: { where: { id: string }; data: { lastSyncedAt: Date } }): Promise<unknown>;
  };
}

export interface WalletSyncOptions {
  /** How often the monitored public-key set is refreshed (ms). */
  publicKeyReloadMs?: number;
  /** Minimum interval between `lastSyncedAt` writes per wallet (ms). */
  writeIntervalMs?: number;
  /** Injectable clock for tests. */
  now?: () => Date;
}

export interface WalletSyncResult {
  /** Whether any monitored wallet matched the activity. */
  matched: boolean;
  /** Number of wallets whose `lastSyncedAt` was actually written. */
  updated: number;
  /** Number of matching wallets skipped because they were written recently. */
  throttled: number;
}

export interface WalletSyncService {
  /**
   * Record on-chain activity for an account. When the account is monitored,
   * refreshes its `lastSyncedAt` subject to the write throttle.
   */
  handleAccountActivity(accountId?: string | null): Promise<WalletSyncResult>;
}

export const DEFAULT_PUBLIC_KEY_RELOAD_MS = 60_000;
export const DEFAULT_WRITE_INTERVAL_MS = 60_000;

export function createWalletSyncService(
  db: MonitoredSyncDb,
  options: WalletSyncOptions = {},
): WalletSyncService {
  const publicKeyReloadMs = options.publicKeyReloadMs ?? DEFAULT_PUBLIC_KEY_RELOAD_MS;
  const writeIntervalMs = options.writeIntervalMs ?? DEFAULT_WRITE_INTERVAL_MS;
  const now = options.now ?? (() => new Date());

  let publicKeys: Set<string> | null = null;
  let keysLoadedAt = 0;
  const lastWriteAt = new Map<string, number>();

  async function ensurePublicKeys(current: number): Promise<Set<string>> {
    if (publicKeys && current - keysLoadedAt < publicKeyReloadMs) {
      return publicKeys;
    }
    // Only monitored wallets that are still active should count.
    const rows = await db.monitoredWallet.findMany({
      where: { isActive: true },
      select: { publicKey: true },
    });
    publicKeys = new Set(rows.map((r) => r.publicKey));
    keysLoadedAt = current;
    return publicKeys;
  }

  return {
    async handleAccountActivity(accountId) {
      const current = now().getTime();
      if (!accountId) {
        return { matched: false, updated: 0, throttled: 0 };
      }

      const keys = await ensurePublicKeys(current);
      if (!keys.has(accountId)) {
        return { matched: false, updated: 0, throttled: 0 };
      }

      // The same public key can be monitored by several users.
      const wallets = await db.monitoredWallet.findMany({
        where: { publicKey: accountId, isActive: true },
        select: { id: true, publicKey: true },
      });
      if (wallets.length === 0) {
        return { matched: false, updated: 0, throttled: 0 };
      }

      let updated = 0;
      let throttled = 0;
      for (const wallet of wallets) {
        const lastWrite = lastWriteAt.get(wallet.id);
        if (lastWrite !== undefined && current - lastWrite < writeIntervalMs) {
          throttled++;
          continue;
        }
        lastWriteAt.set(wallet.id, current);
        await db.monitoredWallet.update({
          where: { id: wallet.id },
          data: { lastSyncedAt: new Date(current) },
        });
        updated++;
      }

      return { matched: true, updated, throttled };
    },
  };
}
