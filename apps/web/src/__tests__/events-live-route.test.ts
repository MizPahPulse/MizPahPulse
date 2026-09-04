/**
 * API route tests for GET /api/v1/events/live:
 *  - #33: SSE resumability via the `Last-Event-ID` request header
 *  - #32: zod validation of the `category` / `eventType` query filters
 *
 * Prisma is mocked; the polling interval is driven with fake timers.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  event: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('@mizpah-pulse/database', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

import { GET } from '@/app/api/v1/events/live/route';
import { parseLastEventId } from '@/lib/sse';

const EVENT = {
  id: 'evt_new',
  eventType: 'PAYMENT',
  category: 'PAYMENT',
  timestamp: new Date('2026-01-01T00:00:01.000Z'),
  accountId: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  contractId: null,
  assetCode: null,
  amount: '125',
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.event.findUnique.mockResolvedValue(null);
  prismaMock.event.findMany.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('parseLastEventId', () => {
  it('returns null for missing or blank headers', () => {
    expect(parseLastEventId(null)).toBeNull();
    expect(parseLastEventId('   ')).toBeNull();
  });

  it('returns null for absurdly long ids', () => {
    expect(parseLastEventId('x'.repeat(200))).toBeNull();
  });

  it('returns a trimmed valid id', () => {
    expect(parseLastEventId('  evt_prev  ')).toBe('evt_prev');
  });
});

describe('GET /api/v1/events/live', () => {
  it('resumes from the Last-Event-ID header (#33)', async () => {
    vi.useFakeTimers();
    const lastTimestamp = new Date('2026-01-01T00:00:00.000Z');
    prismaMock.event.findUnique.mockResolvedValue({ id: 'evt_prev', timestamp: lastTimestamp });
    prismaMock.event.findMany.mockResolvedValue([EVENT]);

    const res = await GET(
      new Request('http://localhost:3000/api/v1/events/live', {
        headers: { 'Last-Event-ID': 'evt_prev' },
      }),
      undefined,
    );
    const reader = res.body!.getReader();

    // First chunk: the initial "connected" event.
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toContain('event: connected');

    // Second chunk arrives after the 2s poll fires.
    const secondPromise = reader.read();
    await vi.advanceTimersByTimeAsync(2000);
    const second = await secondPromise;
    const chunk = new TextDecoder().decode(second.value);

    expect(prismaMock.event.findUnique).toHaveBeenCalledWith({
      where: { id: 'evt_prev' },
      select: { timestamp: true },
    });
    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ timestamp: { gt: lastTimestamp } }),
        orderBy: { timestamp: 'asc' },
        take: 20,
      }),
    );
    expect(chunk).toContain('id: evt_new');
    expect(chunk).toContain('event: event');

    await reader.cancel();
  });

  it('does not filter by timestamp when no Last-Event-ID is provided (#33)', async () => {
    vi.useFakeTimers();
    prismaMock.event.findMany.mockResolvedValue([EVENT]);

    const res = await GET(new Request('http://localhost:3000/api/v1/events/live'), undefined);
    const reader = res.body!.getReader();
    await reader.read(); // connected event

    const nextPromise = reader.read();
    await vi.advanceTimersByTimeAsync(2000);
    await nextPromise;

    expect(prismaMock.event.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        take: 20,
      }),
    );

    await reader.cancel();
  });

  it('applies category and eventType filters from the query string (#32)', async () => {
    vi.useFakeTimers();
    prismaMock.event.findMany.mockResolvedValue([EVENT]);

    const res = await GET(
      new Request('http://localhost:3000/api/v1/events/live?category=PAYMENT&eventType=DEX_TRADE'),
      undefined,
    );
    const reader = res.body!.getReader();
    await reader.read(); // connected event

    const nextPromise = reader.read();
    await vi.advanceTimersByTimeAsync(2000);
    await nextPromise;

    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          category: { in: ['PAYMENT'] },
          eventType: { in: ['DEX_TRADE'] },
        },
      }),
    );

    await reader.cancel();
  });

  it('rejects more than 20 filters with 400 VALIDATION_ERROR (#32)', async () => {
    const params = Array.from({ length: 21 }, (_, i) => `category=c${i}`).join('&');
    const res = await GET(
      new Request(`http://localhost:3000/api/v1/events/live?${params}`),
      undefined,
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(prismaMock.event.findMany).not.toHaveBeenCalled();
  });

  it('rejects empty filter values with 400 VALIDATION_ERROR (#32)', async () => {
    const res = await GET(
      new Request('http://localhost:3000/api/v1/events/live?category='),
      undefined,
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('closes the stream cleanly when the client disconnects (#33)', async () => {
    vi.useFakeTimers();
    const res = await GET(new Request('http://localhost:3000/api/v1/events/live'), undefined);
    const reader = res.body!.getReader();

    await reader.read(); // connected event
    await reader.cancel();

    // Advancing time after cancellation must not throw or enqueue more data.
    await vi.advanceTimersByTimeAsync(5000);
    const { done } = await reader.read();
    expect(done).toBe(true);
  });
});
