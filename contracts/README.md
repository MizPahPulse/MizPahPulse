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
- **Rate Limiting**: Cooldown-based rate-limited pulse with configurable window
- **Time-Locked Ops**: Execute operations after a specific ledger timestamp
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

### Deploy

```bash
DEPLOYER_SECRET=S... npx tsx scripts/deploy-contract.ts
```

## Architecture

```
pulse/
  src/
    lib.rs      # Contract implementation
    test.rs     # Unit tests (48 tests incl. property + gas estimation)
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
| `get_pulse_count()` | Total pulse count |
| `get_pulse_data()` | Pulse count + last caller + last pulse timestamp |
| `get_last_received()` | Last cross-contract pulse received |
| `is_paused()` / `is_killed()` | Pause / kill switch state |
| `estimate_pulse_cost()` | Read-only gas cost estimate (stroops) |
