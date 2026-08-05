import { prisma } from '@mizpah-pulse/database';
import { errorResponse, ErrorCode } from './api-errors';
import type { NextResponse } from 'next/server';

/**
 * Authenticate a request using an API key from the X-API-Key header.
 * Returns null if authenticated, or an error response if not.
 */
export async function authenticateApiKey(request: Request): Promise<NextResponse | null> {
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    return errorResponse(ErrorCode.UNAUTHORIZED, 'API key is required. Provide it via the X-API-Key header.');
  }

  // Validate key format
  if (!apiKey.startsWith('mp_') || apiKey.length < 20) {
    return errorResponse(ErrorCode.UNAUTHORIZED, 'Invalid API key format.');
  }

  try {
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      select: { id: true, isActive: true, expiresAt: true, permissions: true },
    });

    if (!key || !key.isActive) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Invalid or inactive API key.');
    }

    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return errorResponse(ErrorCode.FORBIDDEN, 'API key has expired.');
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    return null; // Authenticated
  } catch {
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Authentication check failed.');
  }
}

/**
 * Optional auth: like authenticateApiKey but returns user info instead of blocking.
 */
export async function getApiKeyInfo(request: Request): Promise<{
  authenticated: boolean;
  permissions: string[];
} | null> {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return null;

  try {
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      select: { isActive: true, expiresAt: true, permissions: true },
    });

    if (!key || !key.isActive) return { authenticated: false, permissions: [] };
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return { authenticated: false, permissions: [] };
    }

    return {
      authenticated: true,
      permissions: key.permissions as unknown as string[],
    };
  } catch {
    return null;
  }
}
