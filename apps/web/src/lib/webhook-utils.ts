/**
 * Shared helpers for the webhook API routes (issue #27).
 *
 * `maskSecret` and `sanitizeWebhook` are used by both the collection route
 * (GET/POST /api/v1/webhooks) and the item route (DELETE/PATCH
 * /api/v1/webhooks/[id]) so a signing secret can never leak through the API.
 */

/**
 * Mask a signing secret so it can never be fully exposed through the API.
 */
export function maskSecret(secret: string): string {
  const prefix = secret.startsWith('whsec_') ? 'whsec_' : '';
  return `${prefix}${'\u2022'.repeat(12)}`;
}

/**
 * Strip the raw secret from a webhook record and attach a masked placeholder.
 */
export function sanitizeWebhook(w: {
  secret?: string | null;
  [key: string]: unknown;
}): Record<string, unknown> {
  const { secret, ...rest } = w;
  return {
    ...rest,
    secretMasked: secret ? maskSecret(secret) : null,
  };
}
