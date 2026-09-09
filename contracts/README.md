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
- **Stellar Payment Rails**: SEP-41 transfers of any Stellar asset, native XLM, allowance-based pull payments (`transfer_from`), batch/payroll distribution, and contract balance withdrawal
- **Configurable Native Rail**: `tip_xlm`/`withdraw_xlm`/`get_xlm_balance` default to the well-known XLM SAC and can be re-pointed by the owner
- **365-Code Error Taxonomy**: machine-readable, globally-unique failure codes (see [`ERRORS.md`](./ERRORS.md))

### Error Codes

The contract ships a **365-code machine-readable failure taxonomy** — every code
is a distinct `ScError::Contract` value, globally unique, so integrators can
branch on failure class without string-matching. Codes are grouped into
per-class ranges (legacy 1-10, then 1xx … 29xx); the Stellar protocol caps a
single spec'd error enum at 50 cases, so the taxonomy is split into one enum
per class, all of which are emitted in the on-chain contract spec.

| Range | Class |
|-------|-------|
| 1-10 | Legacy codes (kept for compat) |
| 1xx | Authorization & access control |
| 2xx | Contract lifecycle / state |
| 3xx | Input validation |
| 4xx | Limits & rate limiting |
| 5xx | Time-locked operations |
| 6xx | Payments (Stellar rails) |
| 7xx | Upgrades & versioning |
| 8xx | Storage & TTL |
| 9xx | Events & observability |
| 10xx | Multi-sig & emergency |
| 11xx | Cross-contract communication |
| 12xx | Gas & estimation |
| 13xx | Native rail configuration |
| 14xx | Batch operations |
| 15xx | Pause / kill safety |
| 16xx | Per-address rate limits |
| 17xx | Pulse counter & cap |
| 18xx | Ownership & signer management |
| 19xx | Initialization & deployment |
| 20xx | Pulse event integrity |
| 21xx | Tipping (SEP-41) |
| 22xx | Withdrawals |
| 23xx | Balance & allowance |
| 24xx | Token metadata |
| 25xx | XLM rail |
| 26xx | Batch tips |
| 27xx | Broadcast & ack |
| 28xx | Configuration |
| 29xx | Reserved / system |

👉 **Full machine-readable table: [`ERRORS.md`](./ERRORS.md)**

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
| `set_native_token_address` | `config` | `ntv_tok` | address |
| `tip_token` / `tip_xlm` | `payment` | `tip` | (token, from, to, amount) |
| `tip_token_from` | `payment` | `tip_from` | (token, from, to, amount) |
| `batch_tip_token` / `batch_tip_xlm` | `payment` | `btip` | (token, from, recipients, total) |
| `withdraw_token` / `withdraw_xlm` | `payment` | `withdraw` | (token, to, amount) |

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
    errors.rs   # 365-code error taxonomy (30 spec'd enums)
    test.rs     # Unit tests (incl. property, gas, cap, and deadline coverage)
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
| `get_native_token_address()` | SAC used by the XLM rails (default: well-known native constant) |
| `get_token_balance(token, addr)` / `get_xlm_balance(addr)` | SEP-41 balance reads |
| `get_token_metadata(token)` | `(name, symbol, decimals)` of any Stellar asset |
| `is_paused()` / `is_killed()` | Pause / kill switch state |
| `estimate_pulse_cost()` | Read-only gas cost estimate (stroops) |

### Stellar payment rails

Multiple Stellar payment systems are exposed on one interface:

| Function | Rail | Description |
|----------|------|-------------|
| `tip_token(token, from, to, amt, caller)` | SEP-41 SAC transfer | Pay any Stellar asset while firing a pulse |
| `tip_xlm(from, to, amt, caller)` | Native XLM SAC | Same, on the native XLM rail |
| `tip_token_from(token, from, to, amt, caller)` | SEP-41 allowance | Pull payment: contract spends `from`'s approved allowance (`transfer_from`) |
| `batch_tip_token(token, from, [(to, amt)], caller)` | SEP-41 batch | Payroll: N recipients, one authorization, one pulse |
| `batch_tip_xlm(from, [(to, amt)], caller)` | Native XLM batch | Payroll on the native rail |
| `withdraw_token(token, to, amt)` / `withdraw_xlm(to, amt)` | Owner drain | Recover funds accidentally sent to the contract |
| `get_token_metadata(token)` | SEP-41 metadata | `(name, symbol, decimals)` for payment UIs |

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

## Gas Benchmark

The contract is compiled with an ultra-low-fee release profile (see
`Cargo.toml`): `opt-level = "z"`, LTO, single codegen unit, `panic = "abort"`,
and symbol stripping. The resulting WASM is **≈ 64 KB**, which keeps both
deployment and upgrade fees (charged per WASM byte) at the floor.

Measured host-budget cost per operation (release build, soroban-sdk 21.7.7,
x86_64 — delta over a fresh initialized contract, serialization + VM
+ storage included):

```text
┌──────────────────────────────────┬────────────┬────────────┐
│ Operation                        │ CPU insns  │ Mem bytes  │
├──────────────────────────────────┼────────────┼────────────┤
│ get_pulse_count                  │      23368 │       4041 │
│ get_pulse_data                   │      27394 │       4376 │
│ get_version                      │      23910 │       4037 │
│ get_signers                      │      25061 │       4197 │
│ get_token_balance                │      81405 │      12430 │
│ estimate_pulse_cost              │      20729 │       3669 │
│ pulse                            │      43972 │       8184 │
│ batch_pulse(3)                   │      59261 │      10592 │
│ rate_limited_pulse               │      59866 │      10603 │
│ tip_token(SEP-41)                │     286766 │      44943 │
│ tip_xlm(native rail)             │     297190 │      43964 │
│ tip_token_from(allowance)        │     364811 │      54225 │
│ batch_tip_token(3)               │     616399 │      87874 │
│ get_token_metadata               │     150866 │      26078 │
│ withdraw_token                   │     273716 │      41631 │
│ set_signers                      │      77084 │      16810 │
│ set_max_pulse_count              │      82224 │      18492 │
│ pause                            │      83897 │      19318 │
│ unpause                          │      84108 │      19640 │
│ kill                             │      84698 │      19970 │
│ set_address_rate_limit           │      94540 │      22859 │
└──────────────────────────────────┴────────────┴────────────┘
```

All operations sit far below the Soroban protocol budget (100M CPU
instructions / 128 MB memory per invocation). A single `pulse()` costs
**~44k CPU instructions and ~8 KB of memory** — about 0.04% of the per-call
CPU budget — and reads cost ~20-25k instructions. For a stroop-level fee
estimate per operation, call `estimate_pulse_cost()`, which returns an
upper bound with headroom for a single `pulse()` invocation.

Re-run the benchmark yourself:

```bash
cd contracts
cargo test --release benchmark -- --nocapture
```

Regression guards in `pulse/src/test.rs` (`CPU_GUARD` / `MEM_GUARD`) fail the
test suite if any operation regresses past 100k CPU insns or 1 MB of memory.

### Test coverage

Line coverage of the contract implementation (`src/lib.rs`) is **98.69%**
(functions 93.75%), measured with `llvm-cov`; CI enforces a **90% floor**
(`contract` job in `.github/workflows/ci.yml`). The taxonomy enums in
`src/errors.rs` carry no executable code and are excluded from the metric.

```bash
rustup component add llvm-tools-preview
cd contracts
RUSTFLAGS="-C instrument-coverage" cargo test --no-run
BIN=$(ls -t target/debug/deps/pulse_contract-* | grep -v '\.d$' | head -1)
LLVM_PROFILE_FILE=target/cov-%p-%m.profraw "$BIN" --test-threads=1
llvm-profdata merge -sparse target/cov-*.profraw -o target/cov.profdata
llvm-cov report "$BIN" -instr-profile=target/cov.profdata \
  --ignore-filename-regex='/.cargo/|/rustc/|soroban-sdk|/target/|test\.rs|benchmark\.rs'
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
`contracts/target/wasm32-unknown-unknown/release/pulse_contract.wasm`
(≈ 64 KB with the ultra-low-fee release profile).

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
📦 WASM: 64.4 KB
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
