# Webhooks Reference

MizPahPulse delivers blockchain events to your endpoint over HTTP POST as
soon as they are indexed. This reference covers the event payloads, the
signing header, verification, retries, and operational endpoints.

---

## 1. Creating a subscription

```bash
curl -X POST https://api.mizpahpulse.dev/api/v1/webhooks \
  -H 'Content-Type: application/json' \
  -d '{
    "endpoint": "https://your-app.example.com/hooks/stellar",
    "events": ["PAYMENT", "DEX_TRADE", "SOROBAN_INVOKE", "NFT_TRANSFER"],
    "maxRetries": 3,
    "retryDelayMs": 5000
  }'
```

A `whsec_` signing secret is generated and returned once (masked on every
later read). Store it — you need it to verify payloads. Rotate it any time
with:

```bash
curl -X POST https://api.mizpahpulse.dev/api/v1/webhooks/{id}/rotate-secret
```

The new secret is returned exactly once and the old one stops verifying
immediately.

### Event types

| Event type                 | Category    | Description                              |
| -------------------------- | ----------- | ---------------------------------------- |
| `PAYMENT`                  | `PAYMENT`   | Classic Stellar payment                  |
| `DEX_TRADE`                | `DEX`       | Offer (order book) trade executed        |
| `SOROBAN_INVOKE`           | `CONTRACT`  | Soroban contract function invocation     |
| `SOROBAN_EVENT`            | `CONTRACT`  | Contract-emitted diagnostic event        |
| `SOROBAN_DEPLOY`           | `CONTRACT`  | Soroban contract deployment             |
| `NFT_MINT` / `NFT_TRANSFER` / `NFT_BURN` | `NFT` | NFT lifecycle events          |
| `CREATE_ACCOUNT`           | `ACCOUNT`   | New account funded                       |
| `SET_OPTIONS`              | `ACCOUNT`   | Account options changed                  |
| `CHANGE_TRUST`             | `TOKEN`     | Trust line created/removed               |
| `LIQUIDITY_POOL_DEPOSIT` / `LIQUIDITY_POOL_WITHDRAW` | `LIQUIDITY` | AMM pool activity |

All values come from the `EventType` enum in
`packages/types/src/events.ts`.

---

## 2. Delivery request

For each matching event the worker POSTs to your endpoint:

```
POST /hooks/stellar HTTP/1.1
Content-Type: application/json
X-Webhook-Signature: t=1730000000000,v1=5f4dcc3b5aa765d61d8327deb882cf99
X-Delivery-ID: cm1abc123
User-Agent: MizPahPulse-Webhook/1.0
```

The JSON body is the **event envelope** — the same shape returned by
`GET /api/v1/events`:

| Field            | Type   | Description                                    |
| ---------------- | ------ | ---------------------------------------------- |
| `id`             | string | MizPahPulse event id (used for `Last-Event-ID`-style dedup) |
| `eventType`      | string | One of the event types above                   |
| `category`       | string | Event category (`PAYMENT`, `DEX`, `CONTRACT`, …) |
| `severity`       | string | `INFO` / `WARNING` / `CRITICAL` / `DEBUG`      |
| `source`         | string | `HORIZON` or `SOROBAN_RPC`                     |
| `transactionHash`| string | Stellar transaction hash                       |
| `ledgerSequence` | string | Ledger the event was observed in               |
| `timestamp`      | string | ISO-8601 time the event was captured           |
| `accountId`      | string\|null | Primary Stellar account involved      |
| `contractId`     | string\|null | Soroban contract id (contract events)  |
| `assetCode`      | string\|null | Asset code when applicable             |
| `assetIssuer`    | string\|null | Asset issuer when applicable           |
| `amount`         | string\|null | Amount as a decimal string when applicable |
| `payload`        | object  | Raw normalized payload (Horizon / Soroban RPC) |

### Example payloads

**PAYMENT**

```json
{
  "id": "cm1abc123",
  "eventType": "PAYMENT",
  "category": "PAYMENT",
  "severity": "INFO",
  "source": "HORIZON",
  "transactionHash": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "ledgerSequence": "421337",
  "timestamp": "2026-09-04T14:30:00.000Z",
  "accountId": "GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "contractId": null,
  "assetCode": "XLM",
  "assetIssuer": null,
  "amount": "125.5000000",
  "payload": {
    "id": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "paging_token": "421337-1",
    "source_account": "GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "to": "GDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "asset_code": "XLM",
    "asset_issuer": null,
    "amount": "125.5000000"
  }
}
```

**DEX_TRADE**

```json
{
  "id": "cm1def456",
  "eventType": "DEX_TRADE",
  "category": "DEX",
  "severity": "INFO",
  "source": "HORIZON",
  "transactionHash": "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
  "ledgerSequence": "421338",
  "timestamp": "2026-09-04T14:31:00.000Z",
  "accountId": "GDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "contractId": null,
  "assetCode": "USDC",
  "assetIssuer": "GABCDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234",
  "amount": "500.0000000",
  "payload": {
    "offer_id": "882341",
    "seller": "GDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "selling": { "asset_code": "XLM", "asset_issuer": null },
    "buying": {
      "asset_code": "USDC",
      "asset_issuer": "GABCDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234"
    },
    "sold_amount": "500.0000000",
    "bought_amount": "1824.1250000"
  }
}
```

**SOROBAN_INVOKE**

```json
{
  "id": "cm1ghi789",
  "eventType": "SOROBAN_INVOKE",
  "category": "CONTRACT",
  "severity": "INFO",
  "source": "SOROBAN_RPC",
  "transactionHash": "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "ledgerSequence": "421339",
  "timestamp": "2026-09-04T14:32:00.000Z",
  "accountId": "GHIJ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "contractId": "CA7G2XYKGZ3X7Q3X7Q3X7Q3X7Q3X7Q3X7Q3X7Q3X7Q3X7Q3X7Q3X7Q3X",
  "assetCode": null,
  "assetIssuer": null,
  "amount": null,
  "payload": {
    "contract_id": "CA7G2XYKGZ3X7Q3X7Q3X7Q3X7Q3X7Q3X7Q3X7Q3X7Q3X7Q3X7Q3X7Q3X",
    "function_name": "swap",
    "tx_hash": "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
    "ledger": 421339,
    "result": { "ok": true }
  }
}
```

**NFT_TRANSFER**

```json
{
  "id": "cm1jkl012",
  "eventType": "NFT_TRANSFER",
  "category": "NFT",
  "severity": "INFO",
  "source": "SOROBAN_RPC",
  "transactionHash": "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5",
  "ledgerSequence": "421340",
  "timestamp": "2026-09-04T14:33:00.000Z",
  "accountId": "GKLM1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "contractId": "CA8H3YZLH4A8R4A8R4A8R4A8R4A8R4A8R4A8R4A8R4A8R4A8R4A8R4A8R4",
  "assetCode": "ART-01",
  "assetIssuer": null,
  "amount": "1",
  "payload": {
    "contract_id": "CA8H3YZLH4A8R4A8R4A8R4A8R4A8R4A8R4A8R4A8R4A8R4A8R4A8R4A8R4",
    "from": "GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "to": "GKLM1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "token_id": "42"
  }
}
```

---

## 3. Verifying signatures

Every delivery is signed with **HMAC-SHA256**. The `X-Webhook-Signature`
header has the form:

```
t=<unix_ms>,v1=<hex_hmac>
```

where the HMAC input is the raw request body prefixed with the timestamp:

```
signed_content = "<t>.<body>"
signature      = HMAC_SHA256(secret, signed_content)
```

**Node.js (official helpers)**

The `@mizpah-pulse/stellar` package exports `signWebhookPayload` and
`verifyWebhookSignature`:

```ts
import { verifyWebhookSignature } from '@mizpah-pulse/stellar';

export async function handleWebhook(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-webhook-signature') ?? '';
  const secret = process.env.MIZPAHPULSE_WEBHOOK_SECRET!;

  if (!verifyWebhookSignature(body, signature, secret)) {
    return new Response('Signature mismatch', { status: 401 });
  }
  // … process the payload …
  return new Response('ok');
}
```

`verifyWebhookSignature` checks the timestamp age (default tolerance
5 minutes — protects against replay attacks) and compares in constant time.

**Standalone (Web Crypto)**

```ts
async function verify(body: string, signature: string, secret: string) {
  const [tPart, v1Part] = signature.split(',');
  const t = tPart.split('=')[1];
  const expected = v1Part.split('=')[1];

  if (Math.abs(Date.now() - Number(t)) > 300_000) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${t}.${body}`),
  );
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === expected;
}
```

Always reply `2xx` quickly and process asynchronously; the worker treats any
non-2xx response as a failed attempt.

---

## 4. Retries and delivery log

- A delivery is created per (event, subscription) pair with status
  `PENDING` and `attempt = 1`.
- Failed attempts are marked `RETRYING` and retried after the
  subscription's `retryDelayMs` (with small jitter) up to `maxRetries`.
- Exhausted deliveries are marked `FAILED`.
- The worker never delivers to an **inactive** subscription.

Inspect deliveries and re-queue failures:

```bash
# List delivery attempts for a webhook
curl https://api.mizpahpulse.dev/api/v1/webhooks/{id}/deliveries?status=FAILED

# Re-queue a single failed delivery (status → PENDING, attempt reset)
curl -X POST https://api.mizpahpulse.dev/api/v1/webhooks/{id}/deliveries/{deliveryId}/replay
```

---

## 5. Best practices

1. **Verify every signature** before trusting a payload.
2. **Deduplicate by `id`** — redeliveries are possible.
3. **Respond fast** (under ~10s) and process asynchronously.
4. **Rotate secrets** periodically with `POST /api/v1/webhooks/{id}/rotate-secret`.
5. **Require HTTPS** in production endpoints.