# MizPahPulse Smart Contracts

Soroban smart contracts for the MizPahPulse blockchain intelligence platform.

## Contract: PulseContract

The PulseContract is a Soroban smart contract that provides:

- **Pulse Counter**: Tracks and emits pulse events with caller tracking
- **Ownership**: Access control with owner-only admin functions
- **Pausability**: Emergency circuit breaker (pause/unpause)
- **Upgrade Support**: Version tracking with audit trail
- **Multi-Sig**: Configurable multi-signature authorization
- **Kill Switch**: Permanent contract termination
- **Batch Operations**: Gas-efficient batch pulse firing
- **Cross-Contract Communication**: Broadcast pulses to other contracts
- **Rate Limiting**: Cooldown-based rate-limited pulse with a global default and configurable per-address overrides
- **Time-Locked Ops**: Execute operations after a specific ledger timestamp, with an optional absolute deadline (not-after)
- **Pulse Counter Cap**: Owner-configurable maximum pulse count to bound storage growth
- **Gas Estimation**: Read-only gas cost estimation

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | NotAuthorized | Caller is not the contract owner |
| 2 | ContractPaused | Contract is paused |
| 3 | InvalidCaller | Invalid caller symbol (empty) |
| 4 | CounterOverflow | Arithmetic overflow in counter |
| 5 | InvalidTargetContract | Target contract address is invalid |
| 6 | BatchTooLarge | Batch size exceeds maximum allowed |
| 7 | TimeLockNotReady | Time-locked operation attempted before its scheduled timestamp |
| 8 | CooldownActive | Rate-limited operation attempted within the active cooldown window |
| 9 | PulseCapReached | Pulse counter has reached the owner-configured cap |
| 10 | TimeLockExpired | Time-locked operation attempted after its absolute deadline |

### Event Topics

Every state-changing operation publishes a contract event. Topics use a
`(primary, secondary)` symbol namespace so the ingester and indexers can
categorize events without decoding the payload:

| Operation | Primary topic | Secondary topic | Data |
|-----------|---------------|-----------------|------|
| `initialize` | `contract` | `init` | version |
| `pulse` | `pulse` | `fired` | (count, caller) |
| `batch_pulse` | `pulse` | `batch` | (batch_size, count) |
| `broadcast_pulse` | `receiver` | `broadcast` | (count, target_contract) |
| `on_pulse_received` | `receiver` | `ack` | (pulse_count, origin_caller) |
| `transfer_ownership` | `owner_chg` | `transfer` | (old_owner, new_owner) |
| `set_signers` | `signers` | `updated` | (signer_count, threshold) |
| `pause` | `paused` | — | () |
| `unpause` | `unpaused` | — | () |
| `upgrade_version` | `upgrade` | `applied` | (new_version, wasm_hash) |
| `update_wasm` | `upgrade` | `wasm` | wasm_hash |
| `kill` | `kill` | `applied` | () |
| `set_max_pulse_count` | `config` | `cap` | max_count |
| `set_default_rate_limit` | `config` | `rate_def` | min_interval_seconds |
| `set_address_rate_limit` | `config` | `rate_addr` | (address, min_interval_seconds) |

## Development

### Prerequisites

- Rust 1.88.0+
- wasm32-unknown-unknown target

### Setup

```bash
rustup target add wasm32-unknown-unknown
```

### Build

```bash
cargo build --target wasm32-unknown-unknown --release
```

Output: `target/wasm32-unknown-unknown/release/pulse_contract.wasm`

### Test

```bash
cargo test
```

### Generate rustdoc

```bash
cargo doc --no-deps
# Open target/doc/pulse_contract/index.html in a browser
```

The crate-level docs describe the on-chain storage layout and a usage example.

### Verify WASM reproducibility

To confirm that a deployed WASM artifact can be reproduced from this source,
build the contract twice into isolated target directories and compare sha256
hashes:

```bash
bash scripts/verify-wasm-reproducibility.sh
```

Exit code `0` means both builds produced byte-identical WASM (reproducible);
`1` means the hashes differ. CI runs this check on `main` (job
`contract-reproducibility`). Always build with `--locked` so the committed
`Cargo.lock` is used.

### Deploy

```bash
DEPLOYER_SECRET=S... npx tsx scripts/deploy-contract.ts
```

## Architecture

```
pulse/
  src/
    lib.rs      # Contract implementation
    test.rs     # Unit tests (incl. property, gas, cap, and deadline coverage)
    types.rs    # Shared type definitions
  Cargo.toml    # Dependencies
```

### Public query endpoints

| Endpoint | Returns |
|----------|---------|
| `owner()` | Current contract owner (or `None` before init) |
| `get_meta()` | Full `ContractMeta` (owner, paused, version) |
| `get_version()` | Current contract version (`0` before init) |
| `get_version_record()` | Latest upgrade audit record |
| `get_signers()` | `(signers, threshold)` multi-sig configuration |
| `get_max_pulse_count()` | Owner-configured pulse cap (`u32::MAX` when unset) |
| `set_max_pulse_count(n)` | Set the pulse cap (owner only) |
| `get_pulse_count()` | Total pulse count |
| `get_pulse_data()` | Pulse count + last caller + last pulse timestamp |
| `get_last_received()` | Last cross-contract pulse received |
| `get_default_rate_limit()` | Default per-address pulse interval in seconds (`0` = disabled) |
| `get_address_rate_limit(addr)` | Per-address override for `addr` (`0` = none) |
| `get_effective_rate_limit(addr)` | Override if set, otherwise the global default |
| `is_paused()` / `is_killed()` | Pause / kill switch state |
| `estimate_pulse_cost()` | Read-only gas cost estimate (stroops) |

### Per-address rate limits (issue #59)

High-volume callers can be throttled per address instead of relying on the
single global cooldown of `rate_limited_pulse`. The owner configures a
default minimum interval, then optionally overrides it for individual
addresses. An address with no override automatically falls back to the global
default.

- `set_default_rate_limit(min_interval_seconds)` — owner-only; `0` disables.
- `set_address_rate_limit(address, min_interval_seconds)` — owner-only;
  `0` clears the override so the address falls back to the default.
- `pulse_from(address, caller)` — address-bound pulse that requires the
  `address` to authorize and enforces the effective interval per address
  before incrementing the shared counter. Without any configured limit it
  behaves exactly like `pulse()`. A pulse inside the cooldown window fails
  with `CooldownActive`.

```text
// Owner configures a 60s default and a 10s override for a hot wallet.
client.set_default_rate_limit(&60);          // 1 pulse / minute by default
client.set_address_rate_limit(&hot_wallet, &10);

// Address-bound pulsing honors the effective limit.
client.pulse_from(&hot_wallet, &symbol_short!("alice"));   // ok
client.pulse_from(&hot_wallet, &symbol_short!("alice"));   // CooldownActive
```

## End-to-End Deployment & Interaction Guide

This walkthrough takes a fresh contributor from source to a live contract on
**Stellar Testnet**, then shows how to interact with it from the CLI and how
its events surface in the app dashboard.

### Prerequisites

- Rust 1.88+ with the `wasm32-unknown-unknown` target
- Node 20+ (the deploy script runs on `tsx`)
- A Stellar Testnet account with XLM for fees (friendbot below)

### Step 1 — Build the WASM artifact

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release --locked
```

**Expected output:** the artifact lands at
`contracts/target/wasm32-unknown-unknown/release/pulse_contract.wasm` (a few
hundred KB).

### Step 2 — Create and fund a Testnet account

```bash
# Generate a keypair (prints the secret key)
node -e "const {Keypair}=require('@stellar/stellar-sdk'); const kp=Keypair.random(); console.log('secret:', kp.secret()); console.log('public:', kp.publicKey());"

# Fund it with the Testnet friendbot (10,000 XLM, no real value)
curl \"https://friendbot.stellar.org?addr=G...PUBLIC...\"
```

**Expected output:** friendbot returns a JSON transaction receipt with
`successful: true`.

### Step 3 — Deploy

```bash
# From the repository root
DEPLOYER_SECRET=S... npx tsx scripts/deploy-contract.ts
```

The script uploads the WASM, creates the contract, derives its ID, and —
since issue #68 — **verifies that the on-chain `WASM_HASH` ledger entry
matches the local artifact** before reporting success.

**Expected output:**

```
📦 WASM: 96.4 KB
⏳ [Upload] Simulating...
⏳ [Create] Simulating...
🔎 [Verify] Reading on-chain WASM_HASH for C... ...
✅ [Verify] On-chain WASM hash matches the local artifact (sha256 ...)
🎉 PulseContract Deployed!
  Contract ID: C...
```

Keep the **Contract ID** (`C…`) — you need it for every interaction below.

### Step 4 — Initialize and interact via the Soroban CLI

First add the `soroban` CLI (installs the same toolchain as the contract):

```bash
cargo install --locked soroban-cli --features opt
```

Point it at Testnet and initialize the contract with your public key as owner:

```bash
export SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
soroban contract invoke \\
  --id C... \\
  --source S... \\
  --network testnet \\
  -- initialize --owner G...PUBLIC...
```

Fire a pulse and read the counter back:

```bash
soroban contract invoke --id C... --source S... --network testnet -- pulse --caller alice
# → returns the new pulse count, e.g. { "ok": 1 }

soroban contract invoke --id C... --source S... --network testnet -- get_pulse_count
# → { "ok": 1 }
```

Admin ops (owner only — swap `S...` for a non-owner key to see
`NotAuthorized`):

```bash
soroban contract invoke --id C... --source S... --network testnet -- pause
soroban contract invoke --id C... --source S... --network testnet -- pulse --caller bob   # fails: ContractPaused
soroban contract invoke --id C... --source S... --network testnet -- unpause
```

### Step 5 — Interact via the app dashboard

1. Run the stack locally (`docker compose up -d`, then `npm run dev` in
   `apps/web`) or point your deployed app at the Testnet RPC.
2. Open **Dashboard → Contracts** — the deployed contract appears in the
   list with its event count.
3. Connect your Freighter wallet (Testnet) and use the **Invoke** panel to
   call `pulse`; the panel records the invocation in the contract's history.
4. Open **Dashboard → Feed** (or the analytics page) to see the `pulse/fired`
   events the ingester captured for the contract.

### Step 6 — Verify on Stellar Expert

1. Open [Stellar Expert Testnet](https://testnet.stellarexpert.org/).
2. Search for your **Contract ID** (`C…`).
3. The contract page shows its ledger entries: `META` (owner, paused,
   version), `PULSE` (count, last caller, last pulse timestamp), and `MAX_COUNT`
   when configured.
4. Open the **Operations / Transfers** tab to see the deploy and each
   `invoke host function` operation you sent.

### Troubleshooting

| Error | Cause & fix |
|-------|-------------|
| `P1000` / `error: network down` | RPC URL typo or Testnet outage. Confirm `SOROBAN_RPC_URL` and retry. |
| `tx_failed` during upload/create | Account has no XLM for fees or sequence number collision. Re-run friendbot and retry. |
| `ContractNotFound` | The contract ID is wrong, or the contract was never created (check Step 3 output). |
| `NotAuthorized` | You are invoking an admin op (e.g. `pause`, `set_signers`) with a non-owner source. Use the deployer secret. |
| `ContractPaused` | The contract is paused (owner `pause` or committee `emergency_pause`). Call `unpause`/`emergency_resume` as owner/committee. |
| `PulseCapReached` | The counter hit `set_max_pulse_count`. Raise the cap (owner only) or the cap stays enforced. |
| WASM verification fails | On-chain `WASM_HASH` differs from the local artifact — rebuild with `--locked` and re-run the deploy script. |
