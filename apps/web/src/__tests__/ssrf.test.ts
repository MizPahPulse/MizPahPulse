import { describe, it, expect } from 'vitest';
import { isBlockedAddress } from '@/lib/ssrf';

describe('isBlockedAddress', () => {
  it('blocks RFC1918 private ranges', () => {
    expect(isBlockedAddress('10.0.0.1')).toBe(true);
    expect(isBlockedAddress('172.16.0.1')).toBe(true);
    expect(isBlockedAddress('172.31.255.255')).toBe(true);
    expect(isBlockedAddress('192.168.1.1')).toBe(true);
  });

  it('blocks loopback, link-local, and cloud metadata addresses', () => {
    expect(isBlockedAddress('127.0.0.1')).toBe(true);
    expect(isBlockedAddress('169.254.169.254')).toBe(true); // cloud metadata
    expect(isBlockedAddress('0.0.0.0')).toBe(true);
  });

  it('blocks CGNAT, multicast, and benchmark ranges', () => {
    expect(isBlockedAddress('100.64.0.1')).toBe(true);
    expect(isBlockedAddress('224.0.0.1')).toBe(true);
    expect(isBlockedAddress('198.18.0.1')).toBe(true);
  });

  it('blocks IPv6 loopback and unique-local addresses', () => {
    expect(isBlockedAddress('::1')).toBe(true);
    expect(isBlockedAddress('fc00::1')).toBe(true);
    expect(isBlockedAddress('fe80::1')).toBe(true);
  });

  it('allows public addresses', () => {
    expect(isBlockedAddress('8.8.8.8')).toBe(false);
    expect(isBlockedAddress('1.1.1.1')).toBe(false);
    expect(isBlockedAddress('172.32.0.1')).toBe(false); // just outside 172.16/12
    expect(isBlockedAddress('2606:4700:4700::1111')).toBe(false);
  });
});
