/**
 * In-memory mock client used when `MOCK_API=1` (issue #100).
 *
 * Lets the Next.js API run without PostgreSQL/Redis by serving deterministic
 * sample data with the SAME response shapes the real Prisma client produces.
 * The mock deliberately stores JSON columns as the raw values routes write
 * (routes that store `JSON.stringify(...)` and read it back with
 * `JSON.parse(...)` behave exactly like they do against Postgres) and stores
 * timestamps as `Date` objects.
 *
 * Only the query surface the API routes use is implemented — a small generic
 * engine over plain row arrays with field filtering, sorting, pagination,
 * relation includes, groupBy/_count, and create/update/delete/upsert. It is
 * NOT a general purpose database; it exists so new contributors can run the
 * app with zero infrastructure.
 */

type Row = Record<string, unknown>;
type Where = Record<string, unknown> | undefined;
type OrderBy = Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;

interface RelationIncludeOptions {
  take?: number;
  orderBy?: OrderBy;
  where?: Record<string, unknown>;
  select?: boolean | Record<string, unknown>;
}

interface QueryOptions {
  where?: Where;
  orderBy?: OrderBy;
  skip?: number;
  take?: number;
  select?: boolean | Record<string, unknown>;
  include?: Record<string, RelationIncludeOptions | boolean>;
}

const MODEL_NAMES = [
  'event',
  'transaction',
  'monitoredWallet',
  'monitoredEvent',
  'apiKey',
  'webhookSubscription',
  'webhookDelivery',
  'asset',
  'auditLog',
  'notificationPreference',
  'user',
  'dailyStat',
] as const;

type ModelName = (typeof MODEL_NAMES)[number];

interface TableStore {
  rows: Row[];
}

/**
 * Relations used by API routes. `localKey`/`foreignKey` describe how a child
 * row references its parent; reverse relations (child → parent) list the
 * child as `via` on the parent relation.
 */
const RELATIONS: Record<
  string,
  Record<string, { table: ModelName; localKey: string; foreignKey: string; single?: boolean }>
> = {
  webhookSubscription: {
    deliveries: { table: 'webhookDelivery', localKey: 'id', foreignKey: 'subscriptionId' },
  },
  webhookDelivery: {
    subscription: {
      table: 'webhookSubscription',
      localKey: 'subscriptionId',
      foreignKey: 'id',
      single: true,
    },
  },
  event: {
    transaction: {
      table: 'transaction',
      localKey: 'transactionHash',
      foreignKey: 'hash',
      single: true,
    },
  },
};

// ──────────────────────────────────────────────
// Filtering / sorting
// ──────────────────────────────────────────────

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'bigint') return value.toString();
  return value;
}

function matchOperator(actual: unknown, filter: Record<string, unknown>): boolean {
  const value = normalize(actual);
  for (const [op, raw] of Object.entries(filter)) {
    const expected = normalize(raw);
    switch (op) {
      case 'equals':
        if (value !== expected) return false;
        break;
      case 'not':
        if (value === expected) return false;
        break;
      case 'in':
        if (!Array.isArray(expected) || !expected.some((e) => normalize(e) === value)) {
          return false;
        }
        break;
      case 'notIn':
        if (Array.isArray(expected) && expected.some((e) => normalize(e) === value)) {
          return false;
        }
        break;
      case 'lt':
      case 'lte':
      case 'gt':
      case 'gte': {
        if (typeof value !== 'number' || typeof expected !== 'number') return false;
        const ok =
          op === 'lt'
            ? value < expected
            : op === 'lte'
              ? value <= expected
              : op === 'gt'
                ? value > expected
                : value >= expected;
        if (!ok) return false;
        break;
      }
      case 'contains':
      case 'startsWith':
      case 'endsWith': {
        const text = String(value ?? '');
        const needle = String(expected);
        const hit =
          op === 'startsWith'
            ? text.startsWith(needle)
            : op === 'endsWith'
              ? text.endsWith(needle)
              : text.includes(needle);
        if (!hit) return false;
        break;
      }
      default:
        // Hints like `mode: 'insensitive'` are ignored by the mock.
        break;
    }
  }
  return true;
}

function matchesField(actual: unknown, filter: unknown): boolean {
  if (filter === null) return actual === null || actual === undefined;
  if (typeof filter === 'object' && filter !== null && !Array.isArray(filter)) {
    return matchOperator(actual, filter as Record<string, unknown>);
  }
  return normalize(actual) === normalize(filter);
}

function matchesWhere(row: Row, where?: Where): boolean {
  if (!where) return true;
  if (Array.isArray(where.AND)) {
    for (const clause of where.AND) {
      if (!matchesWhere(row, clause as Record<string, unknown>)) return false;
    }
  }
  if (Array.isArray(where.OR)) {
    if (!(where.OR as Array<Record<string, unknown>>).some((clause) => matchesWhere(row, clause))) {
      return false;
    }
  }
  if (where.NOT) {
    if (matchesWhere(row, where.NOT as Record<string, unknown>)) return false;
  }
  for (const [key, filter] of Object.entries(where)) {
    if (key === 'AND' || key === 'OR' || key === 'NOT') continue;
    if (!matchesField(row[key], filter)) return false;
  }
  return true;
}

function compare(a: unknown, b: unknown): number {
  const av = normalize(a);
  const bv = normalize(b);
  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  return String(av).localeCompare(String(bv));
}

function sortRows(rows: Row[], orderBy?: OrderBy): Row[] {
  if (!orderBy) return rows;
  const specs = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const spec of specs) {
      for (const [field, dir] of Object.entries(spec)) {
        const cmp = compare(a[field], b[field]);
        if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
      }
    }
    return 0;
  });
}

// ──────────────────────────────────────────────
// Projection + includes
// ──────────────────────────────────────────────

function projectRow(row: Row, select?: boolean | Record<string, unknown>): Row {
  if (!select || select === true) return { ...row };
  const out: Row = {};
  for (const [field, enabled] of Object.entries(select)) {
    if (enabled && row[field] !== undefined) out[field] = row[field];
  }
  return out;
}

function applyInclude(
  row: Row,
  model: string,
  include: Record<string, RelationIncludeOptions | boolean>,
  all: Map<ModelName, TableStore>,
): Row {
  const out: Row = { ...row };
  for (const [relation, opts] of Object.entries(include)) {
    const rel = RELATIONS[model]?.[relation];
    if (!rel) {
      out[relation] = Array.isArray(opts) ? [] : null;
      continue;
    }
    const table = all.get(rel.table)!;
    const related = table.rows.filter(
      (r) => normalize(r[rel.foreignKey]) === normalize(row[rel.localKey]),
    );
    const options: RelationIncludeOptions =
      typeof opts === 'boolean' ? {} : (opts as RelationIncludeOptions);
    let selected = related;
    if (options.where) selected = selected.filter((r) => matchesWhere(r, options.where));
    selected = sortRows(selected, options.orderBy);
    if (options.take !== undefined) selected = selected.slice(0, options.take);
    const projected = selected.map((r) => projectRow(r, options.select));
    if (rel.single) {
      out[relation] = projected[0] ?? null;
    } else {
      out[relation] = projected;
    }
  }
  return out;
}

function rowId(): string {
  return `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function applyDefaults(model: ModelName, data: Row): Row {
  const row: Row = { ...data };
  if (row.id === undefined) row.id = rowId();
  if (row.createdAt === undefined) row.createdAt = new Date();
  if (row.updatedAt === undefined) row.updatedAt = new Date();
  return row;
}

// ──────────────────────────────────────────────
// Delegate factory
// ──────────────────────────────────────────────

function buildDelegate(
  model: ModelName,
  tables: Map<ModelName, TableStore>,
): Record<string, (...args: never[]) => Promise<unknown>> {
  const table = tables.get(model)!;

  const filter = (where?: Where) => table.rows.filter((r) => matchesWhere(r, where));

  const resolve = (options: QueryOptions, rows: Row[]) => {
    const projected = rows.map((row) => {
      const withInclude = options.include
        ? applyInclude(row, model, options.include, tables)
        : { ...row };
      return projectRow(withInclude, options.select);
    });
    return projected;
  };

  const findIndex = (where: Record<string, unknown>): number =>
    table.rows.findIndex((r) => matchesWhere(r, where as Where));

  return {
    findMany: async (options: QueryOptions = {}) => {
      let rows = filter(options.where);
      rows = sortRows(rows, options.orderBy);
      const skip = options.skip ?? 0;
      const take = options.take;
      const sliced = take === undefined ? rows.slice(skip) : rows.slice(skip, skip + take);
      return resolve(options, sliced);
    },

    findUnique: async ({ where }: { where: Record<string, unknown> }) => {
      const idx = findIndex(where);
      return idx === -1 ? null : (resolve({}, [table.rows[idx]!])[0] ?? null);
    },

    findFirst: async (options: QueryOptions = {}) => {
      let rows = filter(options.where);
      rows = sortRows(rows, options.orderBy);
      const row = rows[0];
      return row ? (resolve(options, [row])[0] ?? null) : null;
    },

    count: async ({ where }: { where?: Where } = {}) => filter(where).length,

    create: async ({ data }: { data: Row }) => {
      const row = applyDefaults(model, data);
      table.rows.push(row);
      return { ...row };
    },

    createMany: async ({ data, skipDuplicates }: { data: Row[]; skipDuplicates?: boolean }) => {
      let count = 0;
      for (const item of data) {
        if (skipDuplicates) {
          const existing = table.rows.some((r) =>
            Object.entries(item).every(([k, v]) => normalize(r[k]) === normalize(v)),
          );
          if (existing) continue;
        }
        const row = applyDefaults(model, item);
        table.rows.push(row);
        count++;
      }
      return { count };
    },

    update: async ({ where, data }: { where: Record<string, unknown>; data: Row }) => {
      const idx = findIndex(where);
      if (idx === -1) {
        const err = new Error(`[mock] No ${model} found to update`);
        (err as { code?: string }).code = 'P2025';
        throw err;
      }
      const updated = { ...table.rows[idx]!, ...data, updatedAt: new Date() };
      table.rows[idx] = updated;
      return { ...updated };
    },

    upsert: async ({
      where,
      create,
      update,
    }: {
      where: Record<string, unknown>;
      create: Row;
      update: Row;
    }) => {
      const idx = findIndex(where);
      if (idx === -1) {
        const row = applyDefaults(model, create);
        table.rows.push(row);
        return { ...row };
      }
      const merged = { ...table.rows[idx]!, ...update, updatedAt: new Date() };
      table.rows[idx] = merged;
      return { ...merged };
    },

    delete: async ({ where }: { where: Record<string, unknown> }) => {
      const idx = findIndex(where);
      if (idx === -1) {
        const err = new Error(`[mock] No ${model} found to delete`);
        (err as { code?: string }).code = 'P2025';
        throw err;
      }
      const [removed] = table.rows.splice(idx, 1);
      return { ...(removed ?? {}) };
    },

    deleteMany: async ({ where }: { where?: Where } = {}) => {
      const before = table.rows.length;
      table.rows = table.rows.filter((r) => !matchesWhere(r, where));
      return { count: before - table.rows.length };
    },

    groupBy: async (options: {
      by: string[];
      where?: Where;
      _count?: true | Record<string, boolean>;
      orderBy?: Array<Record<string, 'asc' | 'desc' | Record<string, 'asc' | 'desc'>>>;
      take?: number;
    }) => {
      const groups = new Map<string, Row[]>();
      for (const row of filter(options.where)) {
        const key = options.by.map((field) => String(normalize(row[field]))).join('|');
        const list = groups.get(key) ?? [];
        list.push(row);
        groups.set(key, list);
      }
      const out: Row[] = [];
      for (const rows of groups.values()) {
        const record: Row = {};
        for (const field of options.by) record[field] = rows[0]?.[field] ?? null;
        if (options._count) {
          if (options._count === true) {
            record._count = rows.length;
          } else {
            const counts: Record<string, number> = {};
            for (const [field, enabled] of Object.entries(options._count)) {
              if (!enabled) continue;
              const distinct = new Set(rows.map((r) => String(normalize(r[field]))));
              counts[field] = distinct.size;
            }
            record._count = counts;
          }
        }
        out.push(record);
      }
      if (options.orderBy) {
        out.sort((a, b) => {
          for (const spec of options.orderBy!) {
            for (const [key, dir] of Object.entries(spec)) {
              const av = key === '_count' ? a._count : a[key];
              const bv = key === '_count' ? b._count : b[key];
              void dir;
              const cmp = compare(av, bv);
              if (cmp !== 0) return cmp;
            }
          }
          return 0;
        });
      }
      return out.slice(0, options.take);
    },
  };
}

// ──────────────────────────────────────────────
// Demo dataset (shapes mirror prisma/seed.ts)
// ──────────────────────────────────────────────

function at(daysAgo: number, hour = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const SAMPLE_ACCOUNTS = [
  'GAJB5URQSW6DA5LZLMEIXOZWGSZTUO25OGJQOKSKPYWMOHUKRKLKAOSZ',
  'GDOC4DGUZKVXW3YA4OHYHFQ3QXPRFGBI2GN2B4SRLTSTUZ2COWCD23GO',
  'GC5EWMZS67VPBBUPXYODNC7NCSFQBYNQASBI3O6KUC3XZE6WSCDBFLBB',
  'GAMY7A3TVDQ5EVJNJTFQQP2HKP5FQ3G7J3X2O4K6RZQXB2DHMGF5XUOW4',
  'GC3LWN3YYEFWXSRTC7JXVQQA3QQ5K4LYT4ZQWXQ2F5Y4QMLI3O4L5M6N7',
];

const SAMPLE_CONTRACTS = [
  'CC4HXCVIOPUOS2UJFLTM6WP2ESNSWM4BGJ26XR4SRRVB74TOZMC7EE2C',
  'CB3X1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'CD9Y1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
];

const EVENT_TYPES = [
  'PAYMENT',
  'CREATE_ACCOUNT',
  'SOROBAN_INVOKE',
  'DEX_TRADE',
  'NFT_TRANSFER',
  'TOKEN_TRANSFER',
  'LIQUIDITY_POOL_DEPOSIT',
  'MANAGE_BUY_OFFER',
  'CLAWBACK',
];

function seedDemoData(tables: Map<ModelName, TableStore>) {
  const events = tables.get('event')!.rows;
  const transactions = tables.get('transaction')!.rows;
  const users = tables.get('user')!.rows;
  const assets = tables.get('asset')!.rows;

  users.push(
    { id: 'default', address: SAMPLE_ACCOUNTS[1]!, displayName: 'Default User', createdAt: at(30) },
    { id: 'demo-user', address: SAMPLE_ACCOUNTS[0]!, displayName: 'Demo User', createdAt: at(30) },
  );

  assets.push(
    {
      id: 'asset-usdc',
      code: 'USDC',
      issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      type: 'CREDIT_ALPHANUM12',
    },
    {
      id: 'asset-usdt',
      code: 'USDT',
      issuer: 'GCQTGZQQ5ANDQ6NGTRFNOCN4R5ZOIUM4JBF7AGVYMTEGFY6MOY5KY6CJ',
      type: 'CREDIT_ALPHANUM12',
    },
  );

  let i = 0;
  for (let day = 6; day >= 0; day--) {
    for (let hour = 8; hour <= 21; hour += 3) {
      for (let slot = 0; slot < 2; slot++) {
        const eventType = EVENT_TYPES[i % EVENT_TYPES.length]!;
        const accountId = SAMPLE_ACCOUNTS[i % SAMPLE_ACCOUNTS.length]!;
        const timestamp = at(day, hour);
        const hash = `mocktx_${i}${Math.random().toString(36).slice(2, 8)}`;
        const category =
          eventType === 'PAYMENT'
            ? 'PAYMENT'
            : eventType === 'SOROBAN_INVOKE'
              ? 'CONTRACT'
              : eventType === 'DEX_TRADE'
                ? 'DEX'
                : eventType === 'NFT_TRANSFER'
                  ? 'NFT'
                  : eventType === 'TOKEN_TRANSFER'
                    ? 'TOKEN'
                    : 'ACCOUNT';
        i += 1;
        events.push({
          id: `evt-${i}`,
          eventType,
          source: i % 2 === 0 ? 'HORIZON' : 'SOROBAN_RPC',
          category,
          severity: 'INFO',
          transactionHash: hash,
          ledgerSequence: BigInt(5_000_000 + i),
          pagingToken: `mock-paging-${i}`,
          timestamp,
          accountId,
          contractId:
            eventType === 'SOROBAN_INVOKE' ? SAMPLE_CONTRACTS[i % SAMPLE_CONTRACTS.length] : null,
          assetCode: ['PAYMENT', 'TOKEN_TRANSFER'].includes(eventType) ? 'XLM' : null,
          amount: ['PAYMENT', 'TOKEN_TRANSFER'].includes(eventType) ? String(100 + i) : null,
          payload: { type: eventType, source_account: accountId },
          processedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        transactions.push({
          hash,
          sourceAccount: accountId,
          fee: '250',
          operationCount: (i % 4) + 1,
          successful: true,
          resultCode: 'tx_success',
          ledgerSequence: BigInt(5_000_000 + i),
          createdAt: timestamp,
          envelopeXdr: null,
          resultXdr: null,
          signatures: '[]',
        });
      }
    }
  }

  tables.get('webhookSubscription')!.rows.push({
    id: 'wh-default-1',
    userId: 'default',
    endpoint: 'https://example.com/webhooks/stellar',
    secret: 'whsec_mock_secret',
    events: JSON.stringify(['PAYMENT', 'DEX_TRADE']),
    isActive: true,
    maxRetries: 3,
    retryDelayMs: 5000,
    lastDeliveryAt: at(0, 9),
    failedDeliveries: 0,
    createdAt: at(6),
    updatedAt: at(0, 9),
  });

  tables.get('webhookDelivery')!.rows.push(
    {
      id: 'del-default-1',
      subscriptionId: 'wh-default-1',
      eventId: 'evt-1',
      status: 'SUCCESS',
      statusCode: 200,
      attempt: 1,
      payload: { type: 'PAYMENT' },
      response: '{"ok":true}',
      error: null,
      createdAt: at(0, 9),
      updatedAt: at(0, 9),
      completedAt: at(0, 9),
    },
    {
      id: 'del-default-2',
      subscriptionId: 'wh-default-1',
      eventId: 'evt-2',
      status: 'FAILED',
      statusCode: 500,
      attempt: 3,
      payload: { type: 'DEX_TRADE' },
      response: null,
      error: 'connection refused',
      createdAt: at(1, 18),
      updatedAt: at(1, 18),
      completedAt: at(1, 18),
    },
  );

  tables.get('notificationPreference')!.rows.push({
    id: 'pref-default-1',
    userId: 'default',
    channels: JSON.stringify(['websocket', 'email']),
    events: JSON.stringify(['PAYMENT', 'SOROBAN_INVOKE']),
    enabled: true,
  });

  tables.get('dailyStat')!.rows.push(
    {
      id: 'stat-1',
      date: at(1, 0),
      category: 'PAYMENT',
      eventType: 'PAYMENT',
      count: 12,
      createdAt: at(1),
      updatedAt: at(1),
    },
    {
      id: 'stat-2',
      date: at(1, 0),
      category: 'CONTRACT',
      eventType: 'SOROBAN_INVOKE',
      count: 4,
      createdAt: at(1),
      updatedAt: at(1),
    },
  );
}

// ──────────────────────────────────────────────
// Client factory
// ──────────────────────────────────────────────

export interface MockPrismaClient {
  [delegate: string]: unknown;
  $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Row[]>;
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
}

export function createMockPrisma(): MockPrismaClient {
  const tables = new Map<ModelName, TableStore>();
  for (const model of MODEL_NAMES) tables.set(model, { rows: [] });

  seedDemoData(tables);

  const client: MockPrismaClient = {
    $queryRaw: async () => [{ '?column?': 1 }],
    $connect: async () => undefined,
    $disconnect: async () => undefined,
  };

  for (const model of MODEL_NAMES) {
    client[model] = buildDelegate(model, tables);
  }

  return client;
}

/** True when the app should run against the in-memory mock (issue #100). */
export function isMockApiEnabled(): boolean {
  const value = process.env.MOCK_API;
  return value === '1' || value === 'true';
}
