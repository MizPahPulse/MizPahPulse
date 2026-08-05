import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Generate a signature for a webhook payload using HMAC-SHA256.
 *
 * @param payload - The stringified JSON payload to sign
 * @param secret - The webhook signing secret (e.g., "whsec_...")
 * @param timestamp - Unix timestamp in milliseconds
 * @returns The signature string (e.g., "t=1234567890,v1=abc123def456...")
 */
export function signWebhookPayload(payload: string, secret: string, timestamp?: number): string {
  const ts = timestamp ?? Date.now();
  const signedContent = `${ts}.${payload}`;
  const signature = createHmac('sha256', secret).update(signedContent).digest('hex');

  return `t=${ts},v1=${signature}`;
}

/**
 * Verify a webhook signature against the payload and secret.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param payload - The raw request body string
 * @param signature - The signature from the "X-Webhook-Signature" header
 * @param secret - The webhook signing secret
 * @param tolerance - Max age of the signature in milliseconds (default 5 minutes)
 * @returns Whether the signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance = 300_000, // 5 minutes
): boolean {
  try {
    // Parse the signature header: "t=1234567890,v1=abc123..."
    const parts: Record<string, string> = {};
    for (const part of signature.split(',')) {
      const [key, ...rest] = part.split('=');
      if (key && rest.length > 0) {
        parts[key.trim()] = rest.join('=').trim();
      }
    }

    const timestamp = parseInt(parts['t'] ?? '0', 10);
    const expectedSignature = parts['v1'] ?? '';

    if (!timestamp || !expectedSignature) {
      return false;
    }

    // Check timestamp tolerance to prevent replay attacks
    if (Math.abs(Date.now() - timestamp) > tolerance) {
      return false;
    }

    // Recompute the expected signature
    const signedContent = `${timestamp}.${payload}`;
    const computed = createHmac('sha256', secret).update(signedContent).digest('hex');

    // Constant-time comparison
    const computedBuffer = Buffer.from(computed);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (computedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(computedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Generate a webhook secret with the standard "whsec_" prefix.
 */
export function generateWebhookSecret(): string {
  const randomBytes = createHmac('sha256', String(Date.now()) + String(Math.random()))
    .update(String(process.hrtime.bigint()))
    .digest('base64url')
    .slice(0, 32);

  return `whsec_${randomBytes}`;
}
