/**
 * Prisma error mapping (issue #43).
 *
 * Prisma throws typed `PrismaClientKnownRequestError`s whose `code` follows
 * the `P####` convention (e.g. P2002 = unique constraint violation). Instead
 * of every route collapsing any database failure into a generic 500, this
 * helper translates the common codes into the app's structured error envelope
 * (see `api-errors.ts`) with accurate HTTP status codes and messages.
 *
 * Duck-typing on `error.code` keeps this usable in tests and in any runtime
 * where importing the generated Prisma client class is awkward.
 */
import { errorResponse, ErrorCode, type ErrorCodeType } from './api-errors';
import type { NextResponse } from 'next/server';

interface PrismaErrorShape {
  code?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

export function isPrismaError(error: unknown): error is PrismaErrorShape {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as PrismaErrorShape).code === 'string' &&
    /^P\d{4}$/.test((error as PrismaErrorShape).code as string)
  );
}

export interface MappedPrismaError {
  code: ErrorCodeType;
  status: number;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Map a Prisma error code to the app's structured error contract.
 */
export function mapPrismaError(
  error: unknown,
  fallbackMessage = 'Database operation failed',
): MappedPrismaError {
  if (!isPrismaError(error)) {
    return {
      code: ErrorCode.INTERNAL_ERROR,
      status: 500,
      message: fallbackMessage,
    };
  }

  const meta = error.meta ?? {};

  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation — e.g. duplicate endpoint or key.
      const target = Array.isArray(meta.target) ? meta.target.join(', ') : undefined;
      return {
        code: ErrorCode.CONFLICT,
        status: 409,
        message: target
          ? `A record with the same ${target} already exists`
          : 'A record with these values already exists',
        details: target ? { field: target } : undefined,
      };
    }
    case 'P2025': {
      // Record not found (often from nested create/update/delete).
      return {
        code: ErrorCode.NOT_FOUND,
        status: 404,
        message: error.message || 'The requested record was not found',
      };
    }
    case 'P2003': {
      // Foreign key constraint failed.
      return {
        code: ErrorCode.BAD_REQUEST,
        status: 400,
        message: 'The request references a record that does not exist',
      };
    }
    case 'P2000':
    case 'P2001':
    case 'P2006':
    case 'P2007':
    case 'P2010':
    case 'P2011': {
      // Malformed query / invalid value / null constraint violations.
      return {
        code: ErrorCode.BAD_REQUEST,
        status: 400,
        message: error.message || 'The database rejected the request data',
      };
    }
    case 'P2024': {
      // Connection pool timeout / overload.
      return {
        code: ErrorCode.SERVICE_UNAVAILABLE,
        status: 503,
        message: 'The database is temporarily unavailable',
      };
    }
    default:
      return {
        code: ErrorCode.INTERNAL_ERROR,
        status: 500,
        message: fallbackMessage,
      };
  }
}

/**
 * Build a `NextResponse` for a thrown Prisma error using the app's standard
 * error envelope. Falls back to a 500 when the error isn't a Prisma error.
 */
export function prismaErrorResponse(
  error: unknown,
  fallbackMessage = 'Database operation failed',
  requestId?: string,
): NextResponse {
  const mapped = mapPrismaError(error, fallbackMessage);
  return errorResponse(mapped.code, mapped.message, mapped.details, requestId);
}
