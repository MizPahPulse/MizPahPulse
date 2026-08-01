import { NextResponse } from 'next/server';
import { prisma } from '@mizpah-pulse/database';
import { EventFilterSchema } from '@mizpah-pulse/types';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/events
 *
 * Query processed blockchain events with filtering, pagination, and sorting.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const rawFilters = {
      eventTypes: searchParams.getAll('eventType') || undefined,
      categories: searchParams.getAll('category') || undefined,
      accountIds: searchParams.getAll('accountId') || undefined,
      contractIds: searchParams.getAll('contractId') || undefined,
      assetCodes: searchParams.getAll('assetCode') || undefined,
      severity: searchParams.getAll('severity') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      minLedger: searchParams.get('minLedger') ? parseInt(searchParams.get('minLedger')!) : undefined,
      maxLedger: searchParams.get('maxLedger') ? parseInt(searchParams.get('maxLedger')!) : undefined,
      searchQuery: searchParams.get('q') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      cursor: searchParams.get('cursor') || undefined,
      sortOrder: (searchParams.get('sort') as 'asc' | 'desc') || 'desc',
    };

    const filters = EventFilterSchema.parse(rawFilters);

    const where: Record<string, unknown> = {};

    if (filters.eventTypes?.length) where.eventType = { in: filters.eventTypes };
    if (filters.categories?.length) where.category = { in: filters.categories };
    if (filters.accountIds?.length) where.accountId = { in: filters.accountIds };
    if (filters.contractIds?.length) where.contractId = { in: filters.contractIds };
    if (filters.assetCodes?.length) where.assetCode = { in: filters.assetCodes };
    if (filters.severity?.length) where.severity = { in: filters.severity };
    if (filters.startDate) where.timestamp = { ...(where.timestamp as object), gte: new Date(filters.startDate) };
    if (filters.endDate) where.timestamp = { ...(where.timestamp as object), lte: new Date(filters.endDate) };
    if (filters.minLedger) where.ledgerSequence = { ...(where.ledgerSequence as object), gte: filters.minLedger };
    if (filters.maxLedger) where.ledgerSequence = { ...(where.ledgerSequence as object), lte: filters.maxLedger };
    if (filters.searchQuery) {
      where.OR = [
        { transactionHash: { contains: filters.searchQuery, mode: 'insensitive' } },
        { accountId: { contains: filters.searchQuery, mode: 'insensitive' } },
        { contractId: { contains: filters.searchQuery, mode: 'insensitive' } },
        { eventType: { contains: filters.searchQuery, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { timestamp: filters.sortOrder },
        take: filters.limit + 1,
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      }),
      prisma.event.count({ where }),
    ]);

    const hasMore = events.length > filters.limit;
    const data = hasMore ? events.slice(0, filters.limit) : events;

    return NextResponse.json({
      success: true,
      data: {
        events: data.map((e) => ({
          ...e,
          ledgerSequence: e.ledgerSequence.toString(),
          payload: typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload,
        })),
        total,
        limit: filters.limit,
        cursor: hasMore ? data[data.length - 1]?.id : undefined,
        hasMore,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid filter parameters', details: error.flatten() } },
        { status: 400 },
      );
    }
    console.error('[API] Events error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch events' } },
      { status: 500 },
    );
  }
}
