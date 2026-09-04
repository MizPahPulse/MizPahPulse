/**
 * Unit tests for Prisma error mapping (issue #43): Prisma's P#### error codes
 * must surface as the app's structured error envelope with accurate statuses
 * instead of a generic 500.
 */
import { describe, it, expect } from 'vitest';
import { isPrismaError, mapPrismaError, prismaErrorResponse } from '@/lib/prisma-errors';
import { ErrorCode } from '@/lib/api-errors';

describe('isPrismaError', () => {
  it('detects P#### error codes', () => {
    expect(isPrismaError({ code: 'P2002' })).toBe(true);
    expect(isPrismaError({ code: 'P2025', message: 'not found' })).toBe(true);
  });

  it('rejects non-Prisma values', () => {
    expect(isPrismaError(null)).toBe(false);
    expect(isPrismaError('boom')).toBe(false);
    expect(isPrismaError({})).toBe(false);
    expect(isPrismaError({ code: 'ECONNREFUSED' })).toBe(false);
    expect(isPrismaError({ code: 'P2' })).toBe(false);
  });
});

describe('mapPrismaError', () => {
  it('maps unique constraint violations to 409 CONFLICT with the target field', () => {
    const mapped = mapPrismaError({ code: 'P2002', meta: { target: ['endpoint'] } });
    expect(mapped.code).toBe(ErrorCode.CONFLICT);
    expect(mapped.status).toBe(409);
    expect(mapped.message).toContain('endpoint');
    expect(mapped.details).toEqual({ field: 'endpoint' });
  });

  it('maps unique constraint violations without meta to a generic conflict', () => {
    const mapped = mapPrismaError({ code: 'P2002' });
    expect(mapped.code).toBe(ErrorCode.CONFLICT);
    expect(mapped.message).toContain('A record with these values');
  });

  it('maps missing records to 404 NOT_FOUND', () => {
    const mapped = mapPrismaError({ code: 'P2025', message: 'Record not found' });
    expect(mapped.code).toBe(ErrorCode.NOT_FOUND);
    expect(mapped.status).toBe(404);
    expect(mapped.message).toBe('Record not found');
  });

  it('maps foreign key violations to 400 BAD_REQUEST', () => {
    const mapped = mapPrismaError({ code: 'P2003' });
    expect(mapped.code).toBe(ErrorCode.BAD_REQUEST);
    expect(mapped.status).toBe(400);
  });

  it('maps invalid-value violations to 400 BAD_REQUEST', () => {
    for (const code of ['P2000', 'P2001', 'P2006', 'P2007', 'P2010', 'P2011']) {
      const mapped = mapPrismaError({ code, message: 'bad data' });
      expect(mapped.code).toBe(ErrorCode.BAD_REQUEST);
    }
  });

  it('maps pool timeouts to 503 SERVICE_UNAVAILABLE', () => {
    const mapped = mapPrismaError({ code: 'P2024' });
    expect(mapped.code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
    expect(mapped.status).toBe(503);
  });

  it('falls back to INTERNAL_ERROR for unknown codes and non-Prisma errors', () => {
    expect(mapPrismaError({ code: 'P9999' }).code).toBe(ErrorCode.INTERNAL_ERROR);
    const fallback = mapPrismaError(new Error('boom'), 'custom fallback');
    expect(fallback.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(fallback.message).toBe('custom fallback');
    expect(fallback.status).toBe(500);
  });
});

describe('prismaErrorResponse', () => {
  it('builds a structured NextResponse for a Prisma error', async () => {
    const res = prismaErrorResponse({ code: 'P2002', meta: { target: ['endpoint'] } });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCode.CONFLICT);
    expect(body.error.message).toContain('endpoint');
  });

  it('builds a 500 for a non-Prisma error', async () => {
    const res = prismaErrorResponse(new Error('db down'), 'fallback message');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(body.error.message).toBe('fallback message');
  });

  it('propagates a request id when provided', async () => {
    const res = prismaErrorResponse({ code: 'P2025' }, 'not found', 'req-123');
    const body = await res.json();
    expect(body.meta.requestId).toBe('req-123');
  });
});
