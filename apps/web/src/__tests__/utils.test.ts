import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatTimeAgo, formatDateTime, isToday } from '@/lib/date-utils';
import { formatCompactNumber, formatCurrency, formatPercent, formatDuration } from '@/lib/format-number';
import { isValidEmail, isValidUrl, isValidPositiveNumber, isValidHexColor } from '@/lib/validators';
import { truncateAddress, truncateHash, formatXLM } from '@/lib/display-utils';
import { AppError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, formatError } from '@/lib/error-handler';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('date-utils', () => {
  it('formats time-ago strings from recent timestamps', () => {
    const now = Date.now();
    expect(formatTimeAgo(new Date(now - 3_000))).toBe('just now');
    expect(formatTimeAgo(new Date(now - 30_000))).toBe('30s ago');
    expect(formatTimeAgo(new Date(now - 5 * 60_000))).toBe('5m ago');
    expect(formatTimeAgo(new Date(now - 3 * 3_600_000))).toBe('3h ago');
    expect(formatTimeAgo(new Date(now - 2 * 86_400_000))).toBe('2d ago');
  });

  it('accepts ISO strings and returns localized output for formatDateTime', () => {
    const formatted = formatDateTime('2025-01-15T10:30:00Z');
    expect(formatted).toMatch(/2025|Jan/);
  });

  it('detects today correctly', () => {
    expect(isToday(new Date())).toBe(true);
    expect(isToday(new Date(Date.now() - 86_400_000))).toBe(false);
  });
});

describe('format-number', () => {
  it('formats compact numbers', () => {
    expect(formatCompactNumber(999)).toBe('999');
    expect(formatCompactNumber(1_500)).toBe('1.5K');
    expect(formatCompactNumber(2_300_000)).toBe('2.3M');
  });

  it('formats currency with XLM asset and up to 7 decimals', () => {
    expect(formatCurrency('123.45678901')).toBe('123.456789 XLM');
    expect(formatCurrency(0)).toBe('0 XLM');
  });

  it('formats percentages with sign', () => {
    expect(formatPercent(12.34)).toBe('+12.3%');
    expect(formatPercent(-5)).toBe('-5.0%');
  });

  it('formats durations in ms/s/m', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(1_500)).toBe('1.5s');
    expect(formatDuration(90_000)).toBe('1.5m');
  });
});

describe('validators', () => {
  it('validates emails', () => {
    expect(isValidEmail('dev@mizpah.io')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });

  it('validates URLs', () => {
    expect(isValidUrl('https://example.com/webhooks')).toBe(true);
    expect(isValidUrl('not-a-url')).toBe(false);
  });

  it('validates positive numbers', () => {
    expect(isValidPositiveNumber('42')).toBe(true);
    expect(isValidPositiveNumber('0')).toBe(false);
    expect(isValidPositiveNumber('abc')).toBe(false);
  });

  it('validates hex colors', () => {
    expect(isValidHexColor('#fff')).toBe(true);
    expect(isValidHexColor('#FFAABB')).toBe(true);
    expect(isValidHexColor('#12345')).toBe(false);
  });
});

describe('display-utils', () => {
  it('truncates long addresses and hashes', () => {
    expect(truncateAddress('GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN')).toMatch(/^GA5ZSE\.\.\.KZVN$/);
    expect(truncateAddress('short')).toBe('short');
    expect(truncateHash('0x1234567890abcdef')).toMatch(/\.\.\./);
  });

  it('formats XLM amounts', () => {
    expect(formatXLM('12.5')).toBe('12.5 XLM');
    expect(formatXLM('not-a-number')).toBe('0 XLM');
  });
});

describe('error-handler', () => {
  it('exposes typed AppError subclasses', () => {
    expect(new ValidationError('bad input').code).toBe('VALIDATION_ERROR');
    expect(new ValidationError('bad input').statusCode).toBe(400);
    expect(new NotFoundError('Wallet').message).toBe('Wallet not found');
    expect(new UnauthorizedError().statusCode).toBe(401);
    expect(new ForbiddenError().statusCode).toBe(403);
    expect(new AppError('boom', 'CUSTOM', 418).statusCode).toBe(418);
  });

  it('formats AppErrors without leaking internal details', () => {
    const formatted = formatError(new AppError('secret detail', 'SECRET_CODE', 500));
    expect(formatted).toMatchObject({ code: 'SECRET_CODE', statusCode: 500 });
  });

  it('masks unknown errors in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const formatted = formatError(new Error('internal db password'));
    expect(formatted.message).toBe('Internal server error');
    vi.unstubAllEnvs();
  });
});
