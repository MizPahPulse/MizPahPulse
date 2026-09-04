import { describe, it, expect } from 'vitest';
import {
  signWebhookPayload,
  verifyWebhookSignature,
  generateWebhookSecret,
} from '@mizpah-pulse/stellar';

const SECRET = 'whsec_test_secret_value_1234567890';
const PAYLOAD = JSON.stringify({
  id: 'evt_01',
  type: 'payment',
  amount: '10.5',
  account: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
});

// Fixed timestamp in the past so signature freshness checks are deterministic.
const NOW = Date.now();
const FIXED_TS = NOW - 1_000; // 1 second ago — well inside the default 5m tolerance

describe('signWebhookPayload', () => {
  it('returns the expected t=,v1= header format', () => {
    const signature = signWebhookPayload(PAYLOAD, SECRET, FIXED_TS);
    expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    expect(signature.startsWith(`t=${FIXED_TS},v1=`)).toBe(true);
  });

  it('produces a deterministic signature for the same payload, secret, and timestamp', () => {
    const a = signWebhookPayload(PAYLOAD, SECRET, FIXED_TS);
    const b = signWebhookPayload(PAYLOAD, SECRET, FIXED_TS);
    expect(a).toBe(b);
  });

  it('produces different signatures for different payloads', () => {
    const a = signWebhookPayload(PAYLOAD, SECRET, FIXED_TS);
    const b = signWebhookPayload(PAYLOAD + ' ', SECRET, FIXED_TS);
    expect(a).not.toBe(b);
  });

  it('produces different signatures for different secrets', () => {
    const a = signWebhookPayload(PAYLOAD, SECRET, FIXED_TS);
    const b = signWebhookPayload(PAYLOAD, `${SECRET}-other`, FIXED_TS);
    expect(a).not.toBe(b);
  });
});

describe('verifyWebhookSignature', () => {
  it('accepts a freshly generated valid signature', () => {
    const signature = signWebhookPayload(PAYLOAD, SECRET, FIXED_TS);
    expect(verifyWebhookSignature(PAYLOAD, signature, SECRET)).toBe(true);
  });

  it('rejects a tampered payload', () => {
    const signature = signWebhookPayload(PAYLOAD, SECRET, FIXED_TS);
    expect(verifyWebhookSignature(`${PAYLOAD}0`, signature, SECRET)).toBe(false);
  });

  it('rejects a signature produced with a different secret', () => {
    const signature = signWebhookPayload(PAYLOAD, 'whsec_attacker_secret', FIXED_TS);
    expect(verifyWebhookSignature(PAYLOAD, signature, SECRET)).toBe(false);
  });

  it('rejects a replayed signature once the timestamp tolerance has passed', () => {
    const signature = signWebhookPayload(PAYLOAD, SECRET, NOW - 10 * 60_000); // 10 minutes ago
    expect(verifyWebhookSignature(PAYLOAD, signature, SECRET)).toBe(false);
  });

  it('rejects signatures stamped in the future beyond the tolerance', () => {
    const signature = signWebhookPayload(PAYLOAD, SECRET, NOW + 10 * 60_000);
    expect(verifyWebhookSignature(PAYLOAD, signature, SECRET)).toBe(false);
  });

  it('respects a custom tolerance window', () => {
    const stale = signWebhookPayload(PAYLOAD, SECRET, NOW - 60_000); // 1 minute ago
    expect(verifyWebhookSignature(PAYLOAD, stale, SECRET, 30_000)).toBe(false);
    expect(verifyWebhookSignature(PAYLOAD, stale, SECRET, 120_000)).toBe(true);
  });

  it('rejects malformed signature headers', () => {
    expect(verifyWebhookSignature(PAYLOAD, '', SECRET)).toBe(false);
    expect(verifyWebhookSignature(PAYLOAD, 'garbage', SECRET)).toBe(false);
    expect(verifyWebhookSignature(PAYLOAD, `v1=${'a'.repeat(64)}`, SECRET)).toBe(false); // no t=
    expect(verifyWebhookSignature(PAYLOAD, `t=${FIXED_TS}`, SECRET)).toBe(false); // no v1=
    expect(verifyWebhookSignature(PAYLOAD, `t=not-a-number,v1=${'a'.repeat(64)}`, SECRET)).toBe(
      false,
    );
  });

  it('exercises the constant-time comparison path with an equal-length forgery', () => {
    // A wrong signature with the same length as the expected one reaches the
    // timingSafeEqual comparison instead of failing on length mismatch.
    const valid = signWebhookPayload(PAYLOAD, SECRET, FIXED_TS);
    const forgery = signWebhookPayload(PAYLOAD, 'whsec_wrong_secret_same_len_1', FIXED_TS);
    expect(forgery.split('v1=')[1]).toHaveLength(valid.split('v1=')[1].length);
    expect(verifyWebhookSignature(PAYLOAD, forgery, SECRET)).toBe(false);
  });
});

describe('generateWebhookSecret', () => {
  it('generates secrets with the whsec_ prefix and expected length', () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^whsec_[A-Za-z0-9_-]{32}$/);
  });

  it('generates unique secrets across calls', () => {
    const a = generateWebhookSecret();
    const b = generateWebhookSecret();
    expect(a).not.toBe(b);
  });

  it('generated secrets are usable for signing and verification', () => {
    const secret = generateWebhookSecret();
    const signature = signWebhookPayload(PAYLOAD, secret, FIXED_TS);
    expect(verifyWebhookSignature(PAYLOAD, signature, secret)).toBe(true);
  });
});
