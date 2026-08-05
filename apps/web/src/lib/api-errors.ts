import { NextResponse } from 'next/server';

/**
 * Standardized API error codes for consistent error handling across all endpoints.
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  BAD_REQUEST: 'BAD_REQUEST',
  CONFLICT: 'CONFLICT',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

const HTTP_STATUS_MAP: Record<ErrorCodeType, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.UNSUPPORTED_MEDIA_TYPE]: 415,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
};

export interface ApiError {
  code: ErrorCodeType;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Create a standardized error response.
 */
export function errorResponse(
  code: ErrorCodeType,
  message: string,
  details?: Record<string, unknown>,
  requestId?: string,
): NextResponse {
  const status = HTTP_STATUS_MAP[code] ?? 500;
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
        ...(requestId ? { requestId } : {}),
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    },
    { status },
  );
}

/**
 * Create a standardized success response.
 */
export function successResponse<T>(
  data: T,
  status = 200,
  meta?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
        ...meta,
      },
    },
    { status },
  );
}
