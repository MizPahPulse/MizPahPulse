# Webhooks

Webhook subscriptions deliver one JSON envelope per monitored event. The
envelope shape is stable:

```json
{
  "id": "wh_evt_01HZ...",
  "event": "event.created",
  "type": "PAYMENT",
  "timestamp": "2026-08-06T18:00:00.000Z",
  "data": {
    "transactionHash": "abc123...",
    "ledgerSequence": 123456,
    "accountId": "G...",
    "assetCode": "USDC",
    "assetIssuer": "G...",
    "amount": "25.5"
  },
  "signature": "t=1786190400000,v1=abc123..."
}
```

## Signing

The `signature` field and the `X-Webhook-Signature` header use HMAC-SHA256 over
`<timestamp>.<rawBody>`:

```ts
import { signWebhookPayload, verifyWebhookSignature } from '@mizpah-pulse/stellar';

const body = JSON.stringify(payload);
const signature = signWebhookPayload(body, secret);

const valid = verifyWebhookSignature(
  body,
  signature,
  secret,
  300_000, // 5-minute replay window
);
```

Use a constant-time comparison on the receiving side and reject payloads older
than the configured tolerance.

## Event payload examples

Every example below is the `data` object for one event. `transactionHash`,
`ledgerSequence`, `timestamp`, and `accountId` are omitted where the type does
not use them.

| Event type | `data` example |
| --- | --- |
| `PAYMENT` | `{ "transactionHash": "...", "ledgerSequence": 123, "accountId": "G...", "assetCode": "USDC", "assetIssuer": "G...", "amount": "25.5" }` |
| `CREATE_ACCOUNT` | `{ "transactionHash": "...", "accountId": "G...", "funder": "G...", "startingBalance": "10" }` |
| `ACCOUNT_MERGE` | `{ "transactionHash": "...", "accountId": "G...", "destination": "G..." }` |
| `SET_OPTIONS` | `{ "transactionHash": "...", "accountId": "G...", "homeDomain": "example.com" }` |
| `CHANGE_TRUST` | `{ "transactionHash": "...", "accountId": "G...", "assetCode": "USDC", "assetIssuer": "G...", "limit": "1000" }` |
| `ALLOW_TRUST` | `{ "transactionHash": "...", "accountId": "G...", "trustor": "G...", "assetCode": "USDC", "authorize": true }` |
| `BUMP_SEQUENCE` | `{ "transactionHash": "...", "accountId": "G...", "bumpTo": "100000" }` |
| `PATH_PAYMENT_STRICT_SEND` | `{ "transactionHash": "...", "source": "G...", "destination": "G...", "sendAsset": "XLM", "sendAmount": "5", "destAsset": "USDC", "destMin": "4.9" }` |
| `PATH_PAYMENT_STRICT_RECEIVE` | `{ "transactionHash": "...", "source": "G...", "destination": "G...", "sendAsset": "XLM", "destAsset": "USDC", "destAmount": "10", "sendMax": "11" }` |
| `MANAGE_BUY_OFFER` | `{ "transactionHash": "...", "accountId": "G...", "offerId": 0, "selling": "XLM", "buying": "USDC", "buyAmount": "100", "price": "0.5" }` |
| `MANAGE_SELL_OFFER` | `{ "transactionHash": "...", "accountId": "G...", "offerId": 0, "selling": "USDC", "buying": "XLM", "sellAmount": "50", "price": "2" }` |
| `CREATE_PASSIVE_SELL_OFFER` | `{ "transactionHash": "...", "accountId": "G...", "selling": "USDC", "buying": "XLM", "sellAmount": "50", "price": "2" }` |
| `CLAIM_CLAIMABLE_BALANCE` | `{ "transactionHash": "...", "accountId": "G...", "balanceId": "000...", "assetCode": "USDC", "amount": "100" }` |
| `BEGIN_SPONSORING_FUTURE_RESERVES` | `{ "transactionHash": "...", "sponsor": "G...", "sponsored": "G..." }` |
| `END_SPONSORING_FUTURE_RESERVES` | `{ "transactionHash": "...", "sponsor": "G...", "sponsored": "G..." }` |
| `REVOKE_SPONSORSHIP` | `{ "transactionHash": "...", "accountId": "G...", "revokedLedgerKey": "..." }` |
| `CLAWBACK` | `{ "transactionHash": "...", "accountId": "G...", "from": "G...", "assetCode": "USDC", "amount": "5" }` |
| `CLAWBACK_CLAIMABLE_BALANCE` | `{ "transactionHash": "...", "accountId": "G...", "balanceId": "000..." }` |
| `SET_TRUST_LINE_FLAGS` | `{ "transactionHash": "...", "accountId": "G...", "assetCode": "USDC", "flags": ["AUTHORIZED"] }` |
| `LIQUIDITY_POOL_DEPOSIT` | `{ "transactionHash": "...", "accountId": "G...", "poolId": "...", "assetCodes": ["XLM", "USDC"], "amounts": ["100", "10"] }` |
| `LIQUIDITY_POOL_WITHDRAW` | `{ "transactionHash": "...", "accountId": "G...", "poolId": "...", "assetCodes": ["XLM", "USDC"], "amounts": ["50", "5"] }` |
| `SOROBAN_INVOKE` | `{ "transactionHash": "...", "contractId": "C...", "function": "swap", "ledgerSequence": 123, "payload": {} }` |
| `SOROBAN_DEPLOY` | `{ "transactionHash": "...", "contractId": "C...", "ledgerSequence": 123 }` |
| `SOROBAN_EVENT` | `{ "transactionHash": "...", "contractId": "C...", "event": "transfer", "payload": {} }` |
| `SOROBAN_EXTEND_TTL` | `{ "transactionHash": "...", "contractId": "C...", "ledgerSequence": 123 }` |
| `SOROBAN_RESTORE` | `{ "transactionHash": "...", "contractId": "C...", "ledgerSequence": 123 }` |
| `NFT_MINT` | `{ "transactionHash": "...", "contractId": "C...", "tokenId": "1", "to": "G...", "amount": "1" }` |
| `NFT_TRANSFER` | `{ "transactionHash": "...", "contractId": "C...", "tokenId": "1", "from": "G...", "to": "G...", "amount": "1" }` |
| `NFT_BURN` | `{ "transactionHash": "...", "contractId": "C...", "tokenId": "1", "owner": "G...", "amount": "1" }` |
| `DEX_TRADE` | `{ "transactionHash": "...", "accountId": "G...", "selling": "XLM", "buying": "USDC", "amount": "10", "price": "0.5" }` |
| `DEX_ORDER_CREATE` | `{ "transactionHash": "...", "accountId": "G...", "orderId": 1, "selling": "USDC", "buying": "XLM", "amount": "50", "price": "2" }` |
| `DEX_ORDER_CANCEL` | `{ "transactionHash": "...", "accountId": "G...", "orderId": 1 }` |
| `TOKEN_TRANSFER` | `{ "transactionHash": "...", "from": "G...", "to": "G...", "assetCode": "USDC", "amount": "10" }` |
| `TRUSTLINE_CHANGE` | `{ "transactionHash": "...", "accountId": "G...", "assetCode": "USDC", "limit": "1000" }` |
| `ASSET_ISSUE` | `{ "transactionHash": "...", "accountId": "G...", "assetCode": "USDC", "amount": "1000" }` |
| `CLAIMABLE_BALANCE_CREATED` | `{ "transactionHash": "...", "balanceId": "000...", "assetCode": "USDC", "amount": "100", "claimant": "G..." }` |
| `CLAIMABLE_BALANCE_CLAIMED` | `{ "transactionHash": "...", "balanceId": "000...", "assetCode": "USDC", "amount": "100", "claimant": "G..." }` |
