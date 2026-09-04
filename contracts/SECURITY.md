# PulseContract Security Audit Checklist

This document is a security posture review of the `PulseContract` Soroban
smart contract. Every pattern used by the contract is listed below with the
relevant code section and an audit status. The goal is to give reviewers and
judges a single place to verify each security property.

All references are to `contracts/pulse/src/lib.rs` (function names are stable;
line numbers shift as the crate evolves).

## 1. Access Control

| # | Property | Implementation | Status |
|---|----------|----------------|--------|
| 1.1 | Owner-only admin operations require Stellar auth | `Address::require_auth()` on the stored owner in `transfer_ownership`, `upgrade_version`, `update_wasm`, `set_signers`, `kill`, `set_max_pulse_count` | ✅ |
| 1.2 | Ownership can only be changed by the current owner | `transfer_ownership` calls `meta.owner.require_auth()` before mutating | ✅ |
| 1.3 | Owner cannot be unset or zeroed | `Address` is non-optional; `initialize` requires a caller-supplied address | ✅ |
| 1.4 | Multi-sig committee gating for the emergency brake | `emergency_pause` / `emergency_resume` call `require_signer_threshold()`, which requires the first `threshold` addresses of the configured signer set to authorize (M-of-N) | ✅ |
| 1.5 | Threshold validation on configuration | `set_signers` rejects `threshold == 0` and `threshold > signers.len()` with `PulseError::InvalidCaller` | ✅ |
| 1.6 | Public (unauthenticated) surface is intentional | `pulse`, `batch_pulse`, `rate_limited_pulse`, `time_locked_pulse`, `broadcast_pulse`, `on_pulse_received` and all getters are public by design (a permissionless counter); they mutate only the counter, never ownership/config | ✅ |

## 2. Initialization & Upgrade Safety

| # | Property | Implementation | Status |
|---|----------|----------------|--------|
| 2.1 | Contract cannot be re-initialized | `initialize` returns early when `META_KEY` already exists; a second call is a no-op rather than an overwrite | ✅ |
| 2.2 | Upgrade version must be monotonic | `upgrade_version` rejects `new_version <= meta.version` (`PulseError::CounterOverflow`) | ✅ |
| 2.3 | Upgrade audit trail | `upgrade_version` persists a `VersionRecord` (version, ledger timestamp, new WASM hash) under `VERSION` before updating `META` | ✅ |
| 2.4 | WASM swap requires an already-uploaded hash | `update_wasm` calls `env.deployer().update_current_contract_wasm(hash)`; an unregistered hash aborts the transaction at the host level | ✅ |
| 2.5 | Storage preserved across upgrades | `META`, `PULSE`, `MULTISIG`, `MAX_COUNT` live in instance storage, which survives WASM replacement; covered by the `upgrade_preserves_storage` test | ✅ |

## 3. Arithmetic Safety

| # | Property | Implementation | Status |
|---|----------|----------------|--------|
| 3.1 | Counter increments are overflow-checked | `data.count.checked_add(1)` / `checked_add(batch_size)` with `PulseError::CounterOverflow` on overflow | ✅ |
| 3.2 | Cap enforced without corrupting state | `pulse` / `batch_pulse` compute the new count, check it against the cap, and only persist after all checks pass — a rejected pulse leaves storage untouched | ✅ |
| 3.3 | No unchecked/untrusted integer math | All arithmetic on counters uses `checked_*`; no `wrapping_*` or unchecked ops on storage-derived values | ✅ |

## 4. Reentrancy & Inter-Contract Calls

| # | Property | Implementation | Status |
|---|----------|----------------|--------|
| 4.1 | State is committed before external calls (checks-effects-interactions) | `broadcast_pulse` fires `Self::pulse` (which persists the counter) **before** `env.invoke_contract` on the target | ✅ |
| 4.2 | No value transfers | The contract holds no native assets and performs no `transfer`/`pay` calls, so classic value-stealing reentrancy is not applicable | ✅ |
| 4.3 | Known limitation: no explicit reentrancy guard on `broadcast_pulse` | A malicious target can re-enter `broadcast_pulse`/`pulse`, incrementing the counter again. Impact is limited to counter inflation (no funds or privileged state); rate-limit cooldowns are per-address and checked in `rate_limited_pulse` | ⚠️ documented |

## 5. Circuit Breakers

| # | Property | Implementation | Status |
|---|----------|----------------|--------|
| 5.1 | Owner pause is reversible | `pause` / `unpause` flip `meta.paused`; all mutating functions call `ensure_not_paused` | ✅ |
| 5.2 | Emergency multi-sig pause is independent of the owner key | `emergency_pause` / `emergency_resume` are gated by the signer threshold, so the committee can halt the contract even if the owner key is compromised | ✅ |
| 5.3 | Kill switch is permanent | `kill` sets `paused = true` and `version = u32::MAX`; `is_killed` detects termination; `ensure_not_paused` then blocks every mutation | ✅ |

## 6. Input Validation

| # | Property | Implementation | Status |
|---|----------|----------------|--------|
| 6.1 | Empty caller symbols rejected | `pulse` rejects `Symbol::new(&env, "")` with `PulseError::InvalidCaller` | ✅ |
| 6.2 | Batch size bounded | `batch_pulse` rejects empty vectors (`InvalidCaller`) and sizes over `MAX_BATCH_SIZE = 50` (`BatchTooLarge`) | ✅ |
| 6.3 | Time-lock windows validated | `time_locked_pulse` rejects before `execute_after` (`TimeLockNotReady`) and after `execute_before` when set (`TimeLockExpired`) | ✅ |

## 7. Event Integrity

| # | Property | Implementation | Status |
|---|----------|----------------|--------|
| 7.1 | Every state change emits an event | All mutating functions publish contract events with `(primary, secondary)` symbol topics (see the event-topic table in `contracts/README.md`) | ✅ |
| 7.2 | Events are emitted after state is committed | `env.events().publish` calls follow the storage writes in each function, so observers never see an event for a rolled-back state | ✅ |

## 8. Known Limitations

- **Ordered M-of-N**: `require_signer_threshold` checks the first `threshold`
  addresses of the signer vector, not an arbitrary subset. If a signer leaves
  the committee, the owner must rewrite the signer list (in order) via
  `set_signers`.
- **Ledger-time, not wall-clock**: `time_locked_pulse` and `last_pulse_at`
  use `env.ledger().timestamp()` (ledger close time, ~5s granularity on
  Testnet), so deadlines are approximate to within a ledger.
- **Reentrancy surface**: as noted in §4.3, `broadcast_pulse` has no explicit
  reentrancy lock; the impact is limited to counter inflation.
- **Public counter**: anyone can call `pulse`; rate limiting is opt-in via
  `rate_limited_pulse` (per-caller cooldown) or the owner-configured cap.
- **No multi-sig for regular admin ops**: only the emergency pause/resume path
  is multi-sig; ownership, upgrades, signer config, and the cap remain
  single-owner operations.

## Audit Trail

| Date | Scope | Result |
|------|-------|--------|
| 2026-09-04 | Initial review covering the sections above against `src/lib.rs` and the test suite in `src/test.rs` (access-control, overflow, cap, pause/kill, upgrade-preservation, multi-sig, proptest invariants) | See checklist; all ✅ items covered by tests |

_This checklist is a living document — update it whenever a security-relevant
change lands in the contract._