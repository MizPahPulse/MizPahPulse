/**
 * SSE helpers (issue #33).
 */

/**
 * Parse the SSE `Last-Event-ID` request header so a client can resume a live
 * stream from where it left off. Returns `null` when the header is absent,
 * blank, or absurdly long (defense against header abuse); unknown ids simply
 * fall back to a full stream in the caller.
 */
export function parseLastEventId(headerValue: string | null): string | null {
  const trimmed = headerValue?.trim() ?? '';
  if (!trimmed || trimmed.length > 128) return null;
  return trimmed;
}
