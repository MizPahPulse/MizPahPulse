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
    test.rs     # Unit tests (27+ tests)
    types.rs    # Shared type definitions
  Cargo.toml    # Dependencies
```
