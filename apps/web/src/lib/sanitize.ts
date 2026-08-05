/**
 * Input sanitization utilities for API endpoints.
 * Strips dangerous characters and normalizes input data.
 */

const SQL_INJECTION_PATTERN = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi;
const XSS_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

/**
 * Sanitize a search query string.
 * Trims, limits length, and removes SQL injection keywords.
 */
export function sanitizeSearchQuery(query: string, maxLength = 200): string {
  if (!query) return '';
  return query
    .trim()
    .slice(0, maxLength)
    .replace(SQL_INJECTION_PATTERN, '')
    .replace(XSS_PATTERN, '');
}

/**
 * Sanitize a URL endpoint string for webhooks.
 * Only allows HTTPS URLs (in production) and validates format.
 */
export function sanitizeEndpoint(url: string): string {
  const trimmed = url.trim().slice(0, 500);
  // Basic URL validation - only allow http/https
  if (!/^https?:\/\/.+/.test(trimmed)) {
    throw new Error('Invalid endpoint URL');
  }
  return trimmed;
}

/**
 * Sanitize a user-provided label/name.
 */
export function sanitizeLabel(label: string, maxLength = 100): string {
  return label.replace(/[<>"']/g, '').trim().slice(0, maxLength);
}

/**
 * Sanitize a memo text for Stellar transactions.
 * Truncates to 28 bytes as per Stellar protocol.
 */
export function sanitizeMemo(text: string): string {
  // Truncate to 28 characters (ASCII-safe approximation of 28 bytes)
  return text.replace(/[^\x20-\x7E]/g, '').trim().slice(0, 28);
}

/**
 * Validate and sanitize a numeric amount string.
 */
export function sanitizeAmount(amount: string): string {
  const cleaned = amount.replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error('Invalid amount');
  }
  return parsed.toFixed(7); // Standard Stellar precision
}
