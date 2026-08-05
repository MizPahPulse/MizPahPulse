import { lookup } from 'dns/promises';
import { isIP } from 'net';

/**
 * SSRF protection for webhook endpoints.
 *
 * Webhook delivery makes outbound HTTP requests to user-supplied URLs, so a
 * malicious endpoint pointing at `http://169.254.169.254/` or an internal
 * service would let the ingester probe the private network. This module
 * resolves the hostname and rejects any address in a private, loopback,
 * link-local, or reserved range.
 */

export interface EndpointCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Check whether a single IPv4 address falls into a private/reserved range.
 * Exported for unit testing without DNS.
 */
export function isBlockedAddress(address: string): boolean {
  const type = isIP(address);
  if (type === 4) return isBlockedIPv4(address);
  if (type === 6) return isBlockedIPv6(address);
  return true; // Not a parseable IP — treat as unsafe
}

function isBlockedIPv4(ip: string): boolean {
  const [a = 0, b = 0] = ip.split('.').map(Number);

  return (
    a === 10 || // 10.0.0.0/8 private
    a === 127 || // 127.0.0.0/8 loopback
    a === 0 || // 0.0.0.0/8 "this network"
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local (cloud metadata)
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
    (a === 192 && b === 168) || // 192.168.0.0/16 private
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 CGNAT
    (a === 198 && (b === 18 || b === 19)) || // 198.18.0.0/15 benchmark
    (a === 192 && b === 0) || // 192.0.0.0/24 + 192.0.2.0/24 (documentation)
    a >= 224 // 224.0.0.0/4 multicast + reserved
  );
}

function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === '::1' || // loopback
    lower === '::' || // unspecified
    lower.startsWith('fc') || // fc00::/7 unique local
    lower.startsWith('fd') || // fd00::/7 unique local
    lower.startsWith('fe8') || // fe80::/10 link-local
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb') ||
    lower.startsWith('::ffff:127.') || // v4-mapped loopback
    lower.startsWith('::ffff:10.') ||
    lower.startsWith('::ffff:192.168.')
  );
}

/**
 * Validate that a webhook endpoint resolves to public addresses only.
 */
export async function isPublicWebhookEndpoint(endpoint: string): Promise<EndpointCheck> {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, reason: `Unsupported protocol: ${url.protocol}` };
  }

  let addresses: string[];
  try {
    const records = await lookup(url.hostname, { all: true, verbatim: true });
    addresses = records.map((r) => r.address);
  } catch {
    return { ok: false, reason: `Could not resolve host: ${url.hostname}` };
  }

  if (addresses.length === 0) {
    return { ok: false, reason: `Host resolved to no addresses: ${url.hostname}` };
  }

  for (const address of addresses) {
    if (isBlockedAddress(address)) {
      return {
        ok: false,
        reason: `Endpoint resolves to a private/reserved address (${address})`,
      };
    }
  }

  return { ok: true };
}
