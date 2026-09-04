import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWalletSyncService, type MonitoredSyncDb } from './monitored-sync';

const T0 = new Date('2026-09-04T12:00:00.000Z');

function makeDb(overrides: Partial<MonitoredSyncDb> = {}) {
  const rows: Array<{ id: string; publicKey: string }> = [
    { id: 'wal-1', publicKey: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
    { id: 'wal-2', publicKey: 'GDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  ];
  const updated: Array<{ id: string; at: Date }> = [];
  let listCalls = 0;

  const db: MonitoredSyncDb = {
    monitoredWallet: {
      findMany: async ({ where }) => {
        if (where.publicKey && typeof where.publicKey === 'string') {
          listCalls++;
          return rows.filter((r) => r.publicKey === where.publicKey);
        }
        listCalls++;
        return rows;
      },
      update: async ({ where, data }) => {
        updated.push({ id: where.id, at: data.lastSyncedAt });
        return { id: where.id };
      },
    },
    ...overrides,
  };

  return {
    db,
    rows,
    updated,
    listCalls: () => listCalls,
  };
}

test('ignores events without an account id', async () => {
  const { db } = makeDb();
  const service = createWalletSyncService(db, { now: () => T0 });

  const result = await service.handleAccountActivity(null);
  assert.deepEqual(result, { matched: false, updated: 0, throttled: 0 });
});

test('no-ops when the account is not monitored', async () => {
  const { db } = makeDb();
  const service = createWalletSyncService(db, { now: () => T0 });

  const result = await service.handleAccountActivity('GUNKNOWN');
  assert.deepEqual(result, { matched: false, updated: 0, throttled: 0 });
});

test('updates lastSyncedAt when a monitored wallet is active', async () => {
  const { db, updated } = makeDb();
  const service = createWalletSyncService(db, { now: () => T0 });

  const result = await service.handleAccountActivity('GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ');

  assert.equal(result.matched, true);
  assert.equal(result.updated, 1);
  assert.equal(result.throttled, 0);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].id, 'wal-1');
  assert.equal(updated[0].at.toISOString(), T0.toISOString());
});

test('throttles repeated writes within the write interval', async () => {
  const { db, updated } = makeDb();
  let t = T0.getTime();
  const service = createWalletSyncService(db, {
    writeIntervalMs: 60_000,
    now: () => new Date(t),
  });

  const first = await service.handleAccountActivity('GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  assert.equal(first.updated, 1);

  // A second event 10s later is throttled…
  t += 10_000;
  const second = await service.handleAccountActivity('GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  assert.equal(second.matched, true);
  assert.equal(second.updated, 0);
  assert.equal(second.throttled, 1);

  // …but once the interval elapses the wallet is written again.
  t += 60_000;
  const third = await service.handleAccountActivity('GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  assert.equal(third.updated, 1);

  assert.equal(updated.length, 2);
});

test('updates each monitored wallet sharing the same public key', async () => {
  const { db, updated, rows } = makeDb();
  rows.push({ id: 'wal-3', publicKey: 'GDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ' });

  const service = createWalletSyncService(db, { now: () => T0 });
  const result = await service.handleAccountActivity('GDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ');

  assert.equal(result.matched, true);
  assert.equal(result.updated, 2);
  assert.deepEqual(updated.map((u) => u.id).sort(), ['wal-2', 'wal-3']);
});

test('refreshes the monitored key set after the reload interval', async () => {
  const { db, rows, listCalls } = makeDb();
  let t = T0.getTime();
  const service = createWalletSyncService(db, {
    publicKeyReloadMs: 60_000,
    now: () => new Date(t),
  });

  await service.handleAccountActivity('GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  const callsBefore = listCalls();

  // Within the reload window the key set is cached (only the per-account
  // lookup runs).
  await service.handleAccountActivity('GDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  assert.equal(listCalls() - callsBefore, 1);

  // A newly monitored wallet becomes visible after the reload interval.
  rows.push({ id: 'wal-new', publicKey: 'GNEW1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ' });
  t += 60_001;
  const result = await service.handleAccountActivity('GNEW1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  assert.equal(result.matched, true);
  assert.equal(result.updated, 1);
});

test('surfaces database errors to the caller', async () => {
  const { db } = makeDb({
    monitoredWallet: {
      findMany: async () => {
        throw new Error('connection refused');
      },
      update: async () => ({}),
    },
  });
  const service = createWalletSyncService(db, { now: () => T0 });

  await assert.rejects(
    service.handleAccountActivity('GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
    /connection refused/,
  );
});
