#![no_std]
//! # PulseContract
//!
//! The MizPahPulse heartbeat contract: a Soroban smart contract that tracks
//! and emits `pulse` events with caller tracking, plus ownership, pausability,
//! multi-sig signer management, rate limiting, time-locked operations, batch
//! pulsing, cross-contract broadcasting, a kill switch, and a configurable
//! pulse-counter cap.
//!
//! ## Storage layout
//!
//! | Storage key (`Symbol`) | Scope | Type | Purpose |
//! |------------------------|-------|------|---------|
//! | `META` | instance | [`ContractMeta`] | Owner, paused flag, version |
//! | `PULSE` | instance | [`PulseData`] | Counter, last caller, last pulse timestamp |
//! | `RX_PULSE` | instance | `(u32, Symbol)` | Last cross-contract pulse received |
//! | `MULTISIG` | instance | `(Vec<Address>, u32)` | Signer set + approval threshold |
//! | `VERSION` | persistent | [`VersionRecord`] | Upgrade audit trail (version, timestamp, wasm hash) |
//! | `MAX_COUNT` | instance | `u32` | Owner-configured pulse cap (unset = unlimited) |
//! | `DFLT_RLIM` | persistent | `u64` | Default per-address pulse interval in seconds (`0` = disabled) |
//! | `(ADDR_RLIM, Address)` | persistent | `u64` | Per-address rate-limit override (`0` clears → default applies) |
//! | `(RL_LAST, Address)` | persistent | `u64` | Last pulse ledger timestamp per address (enforcement) |
//!
//! ## Error codes
//!
//! See [`PulseError`] for the full list; codes 1-10 are documented in
//! `contracts/README.md` alongside the event topics.
//!
//! ## Example usage
//!
//! ```text
//! // Deploy and initialize with the owner address.
//! let (contract_id, client) = deploy_initialized(&env, &owner);
//!
//! // Fire pulses and read state.
//! client.pulse(&symbol_short!("alice"));            // -> Ok(1)
//! client.get_pulse_count();                         // -> 1
//! client.get_version();                             // -> 1
//!
//! // Owner-only operations (require auth).
//! client.set_max_pulse_count(&1000);                // cap the counter
//! client.pause();                                   // emergency circuit breaker
//! ```
//!
//! See `contracts/README.md` in the repository root for deployment and
//! interaction instructions.
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, log, symbol_short, Address, Env, IntoVal,
    Symbol, Val, Vec,
};

/// ──────────────────────────────────────────────
/// Error Codes
/// ──────────────────────────────────────────────
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseError {
    /// Caller is not the contract owner
    NotAuthorized = 1,
    /// Contract is paused
    ContractPaused = 2,
    /// Invalid caller symbol (empty)
    InvalidCaller = 3,
    /// Arithmetic overflow in counter
    CounterOverflow = 4,
    /// Target contract address is invalid
    InvalidTargetContract = 5,
    /// Batch size exceeds maximum allowed
    BatchTooLarge = 6,
    /// Time-locked operation attempted before its scheduled timestamp
    TimeLockNotReady = 7,
    /// Rate-limited operation attempted within the active cooldown window
    CooldownActive = 8,
    /// Pulse count cap configured by the owner has been reached
    PulseCapReached = 9,
    /// Time-locked operation attempted after its absolute deadline
    TimeLockExpired = 10,
}

/// Counter for tracking pulse events
#[contracttype]
#[derive(Clone)]
pub struct PulseData {
    pub count: u32,
    pub last_caller: Option<Symbol>,
    pub last_pulse_at: Option<u64>,
}

/// Contract metadata
#[contracttype]
#[derive(Clone)]
pub struct ContractMeta {
    pub owner: Address,
    pub paused: bool,
    pub version: u32,
}

/// Key for storing pulse data in contract storage
const PULSE_KEY: Symbol = symbol_short!("PULSE");

/// Key for storing contract metadata
const META_KEY: Symbol = symbol_short!("META");

/// Key for storing the last received pulse
const RX_PULSE_KEY: Symbol = symbol_short!("RX_PULSE");

/// Key for storing the owner-configured maximum pulse count (issue #64).
/// When unset, the cap defaults to `u32::MAX` (effectively unlimited).
const MAX_PULSE_COUNT_KEY: Symbol = symbol_short!("MAX_COUNT");

/// Storage key for the default per-address rate limit in seconds (issue #59).
/// When 0 (unset) rate limiting is disabled unless an address override exists.
const DEFAULT_RATE_LIMIT_KEY: Symbol = symbol_short!("DFLT_RLIM");

/// Storage-key prefix for per-address rate-limit overrides; the full key is
/// the tuple `(ADDRESS_RATE_LIMIT_KEY, Address)` (issue #59).
const ADDRESS_RATE_LIMIT_KEY: Symbol = symbol_short!("ADDR_RLIM");

/// Storage-key prefix for the last pulse ledger timestamp per address; the
/// full key is the tuple `(ADDRESS_LAST_PULSE_KEY, Address)` (issue #59).
const ADDRESS_LAST_PULSE_KEY: Symbol = symbol_short!("RL_LAST");

/// ──────────────────────────────────────────────
/// Event Topics
/// ──────────────────────────────────────────────
const TOPIC_PULSE: Symbol = symbol_short!("pulse");
const TOPIC_FIRED: Symbol = symbol_short!("fired");
const TOPIC_RECEIVER: Symbol = symbol_short!("receiver");
const TOPIC_BROADCAST: Symbol = symbol_short!("broadcast");
const TOPIC_ACK: Symbol = symbol_short!("ack");
const TOPIC_OWNER_CHANGE: Symbol = symbol_short!("owner_chg");
const TOPIC_PAUSE: Symbol = symbol_short!("paused");
const TOPIC_UNPAUSE: Symbol = symbol_short!("unpaused");
const TOPIC_BATCH: Symbol = symbol_short!("batch");
const TOPIC_SIGNERS: Symbol = symbol_short!("signers");

/// Maximum batch size for batch_pulse
const MAX_BATCH_SIZE: u32 = 50;

/// Multi-sig approval threshold
const MULTISIG_KEY: Symbol = symbol_short!("MULTISIG");

/// Version history for upgrade tracking
#[contracttype]
#[derive(Clone)]
pub struct VersionRecord {
    pub version: u32,
    pub upgraded_at: u64,
    /// Hash of the WASM the contract was upgraded TO (was previously
    /// misleadingly named `previous_hash`).
    pub new_wasm_hash: soroban_sdk::BytesN<32>,
}

#[contract]
pub struct PulseContract;

#[contractimpl]
impl PulseContract {
    /// ── Initialization ────────────────────────

    /// Initialize the contract with an owner. Must be called once after deployment.
    pub fn initialize(env: Env, owner: Address) -> Result<(), PulseError> {
        // Only allow initialization once
        if env.storage().instance().has(&META_KEY) {
            return Ok(());
        }

        let meta = ContractMeta {
            owner,
            paused: false,
            version: 1,
        };

        env.storage().instance().set(&META_KEY, &meta);

        env.events().publish(
            (symbol_short!("contract"), symbol_short!("init")),
            meta.version,
        );

        log!(&env, "PulseContract initialized v{}", meta.version);
        Ok(())
    }

    /// ── Ownership ─────────────────────────────

    /// Get the current contract owner
    pub fn owner(env: Env) -> Option<Address> {
        env.storage()
            .instance()
            .get::<Symbol, ContractMeta>(&META_KEY)
            .map(|m| m.owner)
    }

    /// Get full contract metadata
    pub fn get_meta(env: Env) -> Option<ContractMeta> {
        env.storage()
            .instance()
            .get::<Symbol, ContractMeta>(&META_KEY)
    }

    /// Transfer ownership to a new address (only current owner)
    pub fn transfer_ownership(env: Env, new_owner: Address) -> Result<(), PulseError> {
        let mut meta = env
            .storage()
            .instance()
            .get::<Symbol, ContractMeta>(&META_KEY)
            .unwrap_or(ContractMeta {
                owner: new_owner.clone(),
                paused: false,
                version: 1,
            });

        // Verify caller is current owner
        meta.owner.require_auth();

        let old_owner = meta.owner.clone();
        meta.owner = new_owner.clone();

        env.storage().instance().set(&META_KEY, &meta);

        env.events().publish(
            (TOPIC_OWNER_CHANGE, symbol_short!("transfer")),
            (old_owner, meta.owner.clone()),
        );

        log!(&env, "Ownership transferred to {}", new_owner);
        Ok(())
    }

    /// ── Upgrade Mechanism ─────────────────────

    /// Get the current contract version.
    ///
    /// Returns `0` when the contract has not been initialized yet and the
    /// recorded version (starting at `1` after `initialize`) otherwise.
    pub fn get_version(env: Env) -> u32 {
        env.storage()
            .instance()
            .get::<Symbol, ContractMeta>(&META_KEY)
            .map(|m| m.version)
            .unwrap_or(0)
    }

    /// Upgrade the contract version (only owner).
    /// Stores a version record for audit trail.
    pub fn upgrade_version(
        env: Env,
        new_version: u32,
        wasm_hash: soroban_sdk::BytesN<32>,
    ) -> Result<(), PulseError> {
        let mut meta = get_or_create_meta(&env);
        meta.owner.require_auth();
        if new_version <= meta.version {
            return Err(PulseError::CounterOverflow);
        }

        let record = VersionRecord {
            version: new_version,
            upgraded_at: env.ledger().timestamp(),
            new_wasm_hash: wasm_hash.clone(),
        };

        env.storage()
            .persistent()
            .set(&symbol_short!("VERSION"), &record);

        meta.version = new_version;
        env.storage().instance().set(&META_KEY, &meta);

        env.events().publish(
            (symbol_short!("upgrade"), symbol_short!("applied")),
            (new_version, wasm_hash),
        );

        log!(&env, "Contract upgraded to version {}", new_version);
        Ok(())
    }

    /// Get the latest version record
    pub fn get_version_record(env: Env) -> Option<VersionRecord> {
        env.storage()
            .persistent()
            .get::<Symbol, VersionRecord>(&symbol_short!("VERSION"))
    }

    /// Swap the deployed WASM executable (only owner).
    ///
    /// This is the actual on-chain upgrade: it replaces the contract's
    /// executable with the uploaded WASM identified by `wasm_hash`. Callers
    /// must upload the new WASM (e.g. via a deployer/steward contract) and
    /// pass its hash here. An unregistered hash aborts the transaction.
    pub fn update_wasm(env: Env, wasm_hash: soroban_sdk::BytesN<32>) -> Result<(), PulseError> {
        let meta = get_or_create_meta(&env);
        meta.owner.require_auth();

        env.deployer()
            .update_current_contract_wasm(wasm_hash.clone());

        env.events()
            .publish((symbol_short!("upgrade"), symbol_short!("wasm")), wasm_hash);

        log!(&env, "Contract WASM upgraded");
        Ok(())
    }

    /// ── Multi-Signature Authorization ─────────

    /// Set the list of authorized signers for multi-sig operations.
    /// Only the owner can update the signer list.
    pub fn set_signers(env: Env, signers: Vec<Address>, threshold: u32) -> Result<(), PulseError> {
        let meta = get_or_create_meta(&env);
        meta.owner.require_auth();

        if threshold == 0 || threshold > signers.len() as u32 {
            return Err(PulseError::InvalidCaller);
        }

        let signer_count = signers.len();
        let signer_data = (signers, threshold);
        env.storage().instance().set(&MULTISIG_KEY, &signer_data);

        env.events().publish(
            (TOPIC_SIGNERS, symbol_short!("updated")),
            (signer_count, threshold),
        );

        log!(
            &env,
            "Multi-sig configured: {} signers, threshold {}",
            signer_count,
            threshold
        );
        Ok(())
    }

    /// Get the current multi-sig configuration
    pub fn get_signers(env: Env) -> (Vec<Address>, u32) {
        env.storage()
            .instance()
            .get::<Symbol, (Vec<Address>, u32)>(&MULTISIG_KEY)
            .unwrap_or((Vec::new(&env), 0))
    }

    /// ── Emergency Multi-Sig Override (issue #58) ─

    /// Pause the contract through the multi-sig override.
    ///
    /// Unlike the owner-only `pause()`, this path is gated by the configured
    /// signer threshold: the first `threshold` addresses of the signer set
    /// must authorize (M-of-N over the configured committee). This gives the
    /// signer committee an independent emergency brake that does not depend
    /// on the single owner key. Emits a distinct `emergency/paused` topic.
    pub fn emergency_pause(env: Env) -> Result<(), PulseError> {
        require_signer_threshold(&env)?;

        let mut meta = get_or_create_meta(&env);
        meta.paused = true;
        env.storage().instance().set(&META_KEY, &meta);

        env.events()
            .publish((symbol_short!("emergency"), symbol_short!("paused")), ());
        log!(&env, "Contract emergency-paused by signer committee");
        Ok(())
    }

    /// Lift an emergency pause (multi-sig override, issue #58).
    ///
    /// Requires the same signer threshold as `emergency_pause` and emits a
    /// distinct `emergency/resumed` topic.
    pub fn emergency_resume(env: Env) -> Result<(), PulseError> {
        require_signer_threshold(&env)?;

        let mut meta = get_or_create_meta(&env);
        meta.paused = false;
        env.storage().instance().set(&META_KEY, &meta);

        env.events()
            .publish((symbol_short!("emergency"), symbol_short!("resumed")), ());
        log!(&env, "Emergency pause lifted by signer committee");
        Ok(())
    }

    /// ── Emergency Kill Switch ─────────────────

    /// Permanently disable the contract (canonical kill switch).
    /// Only the owner can invoke this. All mutating functions will fail afterwards.
    /// This is MORE severe than pause: pause is reversible; kill is not.
    pub fn kill(env: Env) -> Result<(), PulseError> {
        let mut meta = get_or_create_meta(&env);
        meta.owner.require_auth();

        // Mark as paused (which blocks all mutations) AND set to max version
        // to indicate this contract has been permanently terminated
        meta.paused = true;
        meta.version = u32::MAX;
        env.storage().instance().set(&META_KEY, &meta);

        env.events()
            .publish((symbol_short!("kill"), symbol_short!("applied")), ());

        log!(&env, "Contract permanently killed");
        Ok(())
    }

    /// Check if the contract has been killed
    pub fn is_killed(env: Env) -> bool {
        env.storage()
            .instance()
            .get::<Symbol, ContractMeta>(&META_KEY)
            .map(|m| m.version == u32::MAX)
            .unwrap_or(false)
    }

    /// ── Time-Locked Operations ────────────────

    /// Fire a pulse that only executes after a specified ledger timestamp.
    ///
    /// `execute_after` is a not-before constraint. `execute_before` is an
    /// optional absolute deadline (not-after): when set, the pulse is rejected
    /// once the ledger timestamp passes it, preventing stale queued
    /// operations from ever executing (issue #57). Pass `None` to keep the
    /// operation open-ended, which preserves the original behavior.
    pub fn time_locked_pulse(
        env: Env,
        caller: Symbol,
        execute_after: u64,
        execute_before: Option<u64>,
    ) -> Result<u32, PulseError> {
        ensure_not_paused(&env)?;

        let now = env.ledger().timestamp();
        if now < execute_after {
            return Err(PulseError::TimeLockNotReady);
        }
        if let Some(deadline) = execute_before {
            if now > deadline {
                return Err(PulseError::TimeLockExpired);
            }
        }

        Self::pulse(env, caller)
    }

    /// ── Pulse Counter Cap (issue #64) ─────────

    /// Configure the maximum pulse count (only owner).
    ///
    /// Once the counter reaches this value, `pulse()` and `batch_pulse()` are
    /// rejected with [`PulseError::PulseCapReached`]. The cap is stored on
    /// chain and can be raised or lowered at any time; raising it re-enables
    /// pulsing. When unset the cap is `u32::MAX` (effectively unlimited).
    pub fn set_max_pulse_count(env: Env, max_count: u32) -> Result<(), PulseError> {
        get_or_create_meta(&env).owner.require_auth();

        env.storage().instance().set(&MAX_PULSE_COUNT_KEY, &max_count);

        env.events()
            .publish((symbol_short!("config"), symbol_short!("cap")), max_count);

        log!(&env, "Maximum pulse count set to {}", max_count);
        Ok(())
    }

    /// Get the configured maximum pulse count (`u32::MAX` when unset).
    pub fn get_max_pulse_count(env: Env) -> u32 {
        pulse_cap(&env)
    }

    /// ── Rate-Limited Pulse with Cooldown ─────

    /// Fire a pulse that enforces a cooldown period between calls.
    /// Prevents spam and provides rate limiting at the contract level.
    pub fn rate_limited_pulse(
        env: Env,
        caller: Symbol,
        cooldown_seconds: u64,
    ) -> Result<u32, PulseError> {
        ensure_not_paused(&env)?;

        // Check if the caller has a cooldown in effect
        let data = env
            .storage()
            .instance()
            .get::<Symbol, PulseData>(&PULSE_KEY)
            .unwrap_or(PulseData {
                count: 0,
                last_caller: None,
                last_pulse_at: None,
            });

        if let Some(last_time) = data.last_pulse_at {
            let now = env.ledger().timestamp();
            let elapsed = now.saturating_sub(last_time);
            if elapsed < cooldown_seconds {
                return Err(PulseError::CooldownActive);
            }
        }

        Self::pulse(env, caller)
    }

    /// ── Per-Address Rate Limits (issue #59) ──

    /// Configure the default minimum interval (in seconds) between pulses for
    /// any address that has no per-address override. Owner only. Passing `0`
    /// clears the default and disables rate limiting.
    pub fn set_default_rate_limit(
        env: Env,
        min_interval_seconds: u64,
    ) -> Result<(), PulseError> {
        get_or_create_meta(&env).owner.require_auth();

        env.storage()
            .persistent()
            .set(&DEFAULT_RATE_LIMIT_KEY, &min_interval_seconds);

        env.events().publish(
            (symbol_short!("config"), symbol_short!("rate_def")),
            min_interval_seconds,
        );

        log!(
            &env,
            "Default pulse rate limit set to {}s",
            min_interval_seconds
        );
        Ok(())
    }

    /// Get the configured default rate limit in seconds (`0` when disabled).
    pub fn get_default_rate_limit(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get::<Symbol, u64>(&DEFAULT_RATE_LIMIT_KEY)
            .unwrap_or(0)
    }

    /// Configure a per-address rate-limit override in seconds (owner only).
    /// The override takes precedence over the default limit. Passing `0`
    /// clears the override so the address falls back to the default limit.
    pub fn set_address_rate_limit(
        env: Env,
        address: Address,
        min_interval_seconds: u64,
    ) -> Result<(), PulseError> {
        get_or_create_meta(&env).owner.require_auth();

        env.storage().persistent().set(
            &(ADDRESS_RATE_LIMIT_KEY, address.clone()),
            &min_interval_seconds,
        );

        env.events().publish(
            (symbol_short!("config"), symbol_short!("rate_addr")),
            (address.clone(), min_interval_seconds),
        );

        log!(
            &env,
            "Pulse rate limit for {} set to {}s",
            address,
            min_interval_seconds
        );
        Ok(())
    }

    /// Get the per-address override in seconds (`0` when none is configured).
    pub fn get_address_rate_limit(env: Env, address: Address) -> u64 {
        env.storage()
            .persistent()
            .get::<(Symbol, Address), u64>(&(ADDRESS_RATE_LIMIT_KEY, address))
            .unwrap_or(0)
    }

    /// Get the effective limit for an address: the per-address override when
    /// set, otherwise the global default. Falls back to `0` (no limiting)
    /// when nothing is configured.
    pub fn get_effective_rate_limit(env: Env, address: Address) -> u64 {
        effective_rate_limit(&env, &address)
    }

    /// ── Gas Optimization ──────────────────────

    /// Get the current gas cost estimate for a pulse operation.
    /// This is a read-only call that returns metadata without modifying state.
    pub fn estimate_pulse_cost(env: Env) -> u32 {
        // Return a fixed cost estimate in stroops.
        // Real implementation would calculate based on current network conditions.
        let base_cost: u32 = 100_000; // ~0.01 XLM in stroops
        let _meta = env
            .storage()
            .instance()
            .get::<Symbol, ContractMeta>(&META_KEY);
        base_cost
    }

    /// Read the current ledger timestamp
    pub fn get_ledger_timestamp(env: Env) -> u64 {
        env.ledger().timestamp()
    }

    /// Get the ledger sequence number
    pub fn get_ledger_sequence(env: Env) -> u32 {
        env.ledger().sequence()
    }

    /// ── Pausability ───────────────────────────

    /// Pause the contract (only owner). When paused, pulse() and broadcast_pulse() will fail.
    pub fn pause(env: Env) -> Result<(), PulseError> {
        let mut meta = get_or_create_meta(&env);
        meta.owner.require_auth();
        if meta.paused {
            return Ok(());
        }

        meta.paused = true;
        env.storage().instance().set(&META_KEY, &meta);

        env.events().publish((TOPIC_PAUSE,), ());
        log!(&env, "Contract paused");
        Ok(())
    }

    /// Unpause the contract (only owner)
    pub fn unpause(env: Env) -> Result<(), PulseError> {
        let mut meta = get_or_create_meta(&env);
        meta.owner.require_auth();
        if !meta.paused {
            return Ok(());
        }

        meta.paused = false;
        env.storage().instance().set(&META_KEY, &meta);

        env.events().publish((TOPIC_UNPAUSE,), ());
        log!(&env, "Contract unpaused");
        Ok(())
    }

    /// Check if the contract is paused
    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get::<Symbol, ContractMeta>(&META_KEY)
            .map(|m| m.paused)
            .unwrap_or(false)
    }

    /// ── Core Pulse ────────────────────────────

    /// Pulse — increments the counter and emits an event.
    /// Each call records the caller and increments the count.
    pub fn pulse(env: Env, caller: Symbol) -> Result<u32, PulseError> {
        ensure_not_paused(&env)?;
        validate_caller_symbol(&env, &caller)?;
        fire_pulse(&env, caller)
    }

    /// Address-bound pulse that honors the per-address rate limit (issue #59).
    ///
    /// The pulsing `address` must authorize the call, so rate limits cannot be
    /// bypassed by spoofing another address. The effective minimum interval is
    /// the address's own override when configured, otherwise the global
    /// default set by `set_default_rate_limit`. When no limit is configured
    /// this behaves exactly like `pulse()`.
    pub fn pulse_from(env: Env, address: Address, caller: Symbol) -> Result<u32, PulseError> {
        ensure_not_paused(&env)?;
        address.require_auth();
        validate_caller_symbol(&env, &caller)?;

        let limit = effective_rate_limit(&env, &address);
        if limit > 0 {
            let now = env.ledger().timestamp();
            let key = (ADDRESS_LAST_PULSE_KEY, address.clone());
            let last = env
                .storage()
                .persistent()
                .get::<(Symbol, Address), u64>(&key)
                .unwrap_or(0);

            if last > 0 && now.saturating_sub(last) < limit {
                return Err(PulseError::CooldownActive);
            }
            env.storage().persistent().set(&key, &now);
        }

        fire_pulse(&env, caller)
    }

    /// Get the current pulse count without modifying state.
    pub fn get_pulse_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get::<Symbol, PulseData>(&PULSE_KEY)
            .map(|d| d.count)
            .unwrap_or(0)
    }

    /// Get the full pulse data (count + last caller + timestamp).
    pub fn get_pulse_data(env: Env) -> PulseData {
        env.storage()
            .instance()
            .get::<Symbol, PulseData>(&PULSE_KEY)
            .unwrap_or(PulseData {
                count: 0,
                last_caller: None,
                last_pulse_at: None,
            })
    }

    /// ── Batch Operations ──────────────────────

    /// Fire multiple pulses in a single invocation. This is more gas-efficient
    /// than calling pulse() N times separately.
    ///
    /// @param callers - Array of caller symbols (max 50)
    /// @returns Final pulse count after all increments
    pub fn batch_pulse(env: Env, callers: Vec<Symbol>) -> Result<u32, PulseError> {
        ensure_not_paused(&env)?;

        if callers.is_empty() {
            return Err(PulseError::InvalidCaller);
        }
        if callers.len() > MAX_BATCH_SIZE as u32 {
            return Err(PulseError::BatchTooLarge);
        }

        let mut data = env
            .storage()
            .instance()
            .get::<Symbol, PulseData>(&PULSE_KEY)
            .unwrap_or(PulseData {
                count: 0,
                last_caller: None,
                last_pulse_at: None,
            });

        let batch_size = callers.len() as u32;
        let new_count = data
            .count
            .checked_add(batch_size)
            .ok_or(PulseError::CounterOverflow)?;
        if new_count > pulse_cap(&env) {
            return Err(PulseError::PulseCapReached);
        }
        data.count = new_count;
        let last = callers.last().unwrap();
        data.last_caller = Some(last.clone());
        data.last_pulse_at = Some(env.ledger().timestamp());

        env.storage().instance().set(&PULSE_KEY, &data);

        // Emit batch event (single event for all pulses)
        env.events()
            .publish((TOPIC_PULSE, TOPIC_BATCH), (batch_size, data.count));

        log!(
            &env,
            "Batch pulse: {} callers, total count: {}",
            batch_size,
            data.count
        );

        Ok(data.count)
    }

    /// ── Inter-Contract Communication ──────────

    /// Broadcast pulse to another contract.
    pub fn broadcast_pulse(
        env: Env,
        target_contract: Address,
        caller: Symbol,
    ) -> Result<(u32, Val), PulseError> {
        ensure_not_paused(&env)?;

        // First, fire our own pulse
        let own_count = Self::pulse(env.clone(), caller.clone())?;

        // Then, invoke the target contract via inter-contract call
        let receiver_result: Val = env.invoke_contract(
            &target_contract,
            &Symbol::new(&env, "on_pulse_received"),
            Vec::from_array(&env, [own_count.into_val(&env), caller.into_val(&env)]),
        );

        // Emit a cross-contract event for monitoring
        env.events().publish(
            (TOPIC_RECEIVER, TOPIC_BROADCAST),
            (own_count, target_contract.clone()),
        );

        log!(
            &env,
            "Pulse #{} broadcasted to contract {}",
            own_count,
            target_contract
        );

        Ok((own_count, receiver_result))
    }

    /// Receive a pulse from another PulseContract instance.
    pub fn on_pulse_received(env: Env, pulse_count: u32, origin_caller: Symbol) -> Symbol {
        log!(
            &env,
            "Received pulse #{} from {}",
            pulse_count,
            origin_caller
        );

        // Store the last received pulse
        env.storage()
            .instance()
            .set(&RX_PULSE_KEY, &(pulse_count, origin_caller.clone()));

        // Emit acknowledgment event
        env.events()
            .publish((TOPIC_RECEIVER, TOPIC_ACK), (pulse_count, origin_caller));

        symbol_short!("ACK")
    }

    /// Get the last received pulse data from cross-contract communication
    pub fn get_last_received(env: Env) -> Option<(u32, Symbol)> {
        env.storage()
            .instance()
            .get::<Symbol, (u32, Symbol)>(&RX_PULSE_KEY)
    }
}

/// ──────────────────────────────────────────────
/// Internal Helpers
/// ──────────────────────────────────────────────

/// Multi-sig gate (issue #58): the first `threshold` configured signers must
/// authorize. Fails with `InvalidCaller` when no multi-sig configuration
/// exists (threshold unset or exceeding the signer set size).
fn require_signer_threshold(env: &Env) -> Result<(), PulseError> {
    let (signers, threshold) = env
        .storage()
        .instance()
        .get::<Symbol, (Vec<Address>, u32)>(&MULTISIG_KEY)
        .unwrap_or((Vec::new(env), 0));

    if threshold == 0 || threshold > signers.len() as u32 {
        return Err(PulseError::InvalidCaller);
    }

    for i in 0..threshold {
        signers.get(i).unwrap().require_auth();
    }
    Ok(())
}

/// Read the configured pulse cap, defaulting to `u32::MAX` (unlimited).
fn pulse_cap(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get::<Symbol, u32>(&MAX_PULSE_COUNT_KEY)
        .unwrap_or(u32::MAX)
}

fn get_or_create_meta(env: &Env) -> ContractMeta {
    env.storage()
        .instance()
        .get::<Symbol, ContractMeta>(&META_KEY)
        .unwrap_or(ContractMeta {
            owner: env.current_contract_address(),
            paused: false,
            version: 1,
        })
}

fn ensure_not_paused(env: &Env) -> Result<(), PulseError> {
    let paused = env
        .storage()
        .instance()
        .get::<Symbol, ContractMeta>(&META_KEY)
        .map(|m| m.paused)
        .unwrap_or(false);

    if paused {
        return Err(PulseError::ContractPaused);
    }
    Ok(())
}

/// Reject empty caller symbols before any state change.
fn validate_caller_symbol(env: &Env, caller: &Symbol) -> Result<(), PulseError> {
    let empty = Symbol::new(env, "");
    if caller == &empty {
        return Err(PulseError::InvalidCaller);
    }
    Ok(())
}

/// Shared counter increment used by `pulse()` and `pulse_from()`: overflow
/// check, owner-configured cap enforcement, persistence, and event emission.
fn fire_pulse(env: &Env, caller: Symbol) -> Result<u32, PulseError> {
    // Load existing pulse data or create new
    let mut data = env
        .storage()
        .instance()
        .get::<Symbol, PulseData>(&PULSE_KEY)
        .unwrap_or(PulseData {
            count: 0,
            last_caller: None,
            last_pulse_at: None,
        });

    // Increment with overflow protection, then enforce the owner-configured
    // cap (issue #64). The counter is not persisted until after the checks,
    // so a rejected pulse leaves storage untouched.
    data.count = data
        .count
        .checked_add(1)
        .ok_or(PulseError::CounterOverflow)?;
    if data.count > pulse_cap(env) {
        return Err(PulseError::PulseCapReached);
    }
    data.last_caller = Some(caller.clone());
    data.last_pulse_at = Some(env.ledger().timestamp());

    // Store updated data
    env.storage().instance().set(&PULSE_KEY, &data);

    // Emit a pulse event with detailed topics for indexing
    env.events()
        .publish((TOPIC_PULSE, TOPIC_FIRED), (data.count, caller.clone()));

    log!(env, "Pulse #{} fired by {}", data.count, caller);

    Ok(data.count)
}

/// Effective minimum interval (seconds) for an address: its per-address
/// override when set, otherwise the global default (issue #59). An override of
/// 0 means "cleared" — fall through to the global default.
fn effective_rate_limit(env: &Env, address: &Address) -> u64 {
    env.storage()
        .persistent()
        .get::<(Symbol, Address), u64>(&(ADDRESS_RATE_LIMIT_KEY, address.clone()))
        .filter(|limit| *limit > 0)
        .or_else(|| {
            env.storage()
                .persistent()
                .get::<Symbol, u64>(&DEFAULT_RATE_LIMIT_KEY)
        })
        .unwrap_or(0)
}

#[cfg(test)]
mod test;
