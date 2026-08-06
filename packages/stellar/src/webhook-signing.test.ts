import { describe, expect, it } from 'vitest';

import {
  generateWebhookSecret,
  signWebhookPayload,
  verifyWebhookSignature,
} from './webhook-signing';

describe('signWebhookPayload', () => {
  it('returns a timestamped HMAC signature', () => {
    const signature = signWebhookPayload('{"ok":true}', 'whsec_test', 1_234);
    expect(signature).toMatch(/^t=1234,v1=[0-9a-f]{64}$/);
  });
});

describe('verifyWebhookSignature', () => {
  const payload = '{"ok":true}';
  const secret = 'whsec_test';

  it('verifies a valid signature', () => {
    const signature = signWebhookPayload(payload, secret, Date.now());
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
  });

  it('rejects a tampered payload', () => {
    const signature = signWebhookPayload(payload, secret, Date.now());
    expect(verifyWebhookSignature('{"ok":false}', signature, secret)).toBe(false);
  });

  it('rejects an expired timestamp', () => {
    const signature = signWebhookPayload(payload, secret, Date.now() - 400_000);
    expect(verifyWebhookSignature(payload, signature, secret, 300_000)).toBe(false);
  });

  it('rejects a signature with the wrong length', () => {
    const signature = 't=1234,v1=abc';
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(false);
  });

  it('rejects a same-length signature with the wrong value', () => {
    const valid = signWebhookPayload(payload, secret, Date.now());
    const wrong = valid.replace(/[0-9a-f]$/, '0');
    expect(verifyWebhookSignature(payload, wrong, secret)).toBe(false);
  });
});

describe('generateWebhookSecret', () => {
  it('generates a whsec-prefixed secret', () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^whsec_[A-Za-z0-9_-]{32}$/);
  });
});
