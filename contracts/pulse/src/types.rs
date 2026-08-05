/// Shared type definitions for PulseContract.
/// Separating types makes the contract more maintainable and allows
/// other contracts to import these types for composability.

use soroban_sdk::{contracttype, Address, Symbol};

/// Counter for tracking pulse events
#[contracttype]
#[derive(Clone, Debug)]
pub struct PulseData {
    pub count: u32,
    pub last_caller: Option<Symbol>,
    pub last_pulse_at: Option<u64>,
}

/// Contract metadata including ownership and version
#[contracttype]
#[derive(Clone, Debug)]
pub struct ContractMeta {
    pub owner: Address,
    pub paused: bool,
    pub version: u32,
}

/// Version history record for upgrade audit trail
#[contracttype]
#[derive(Clone, Debug)]
pub struct VersionRecord {
    pub version: u32,
    pub upgraded_at: u64,
    /// Hash of the WASM the contract was upgraded TO (was previously
    /// misleadingly named `previous_hash`).
    pub new_wasm_hash: soroban_sdk::BytesN<32>,
}

/// Event topic constants - centralized for contract composability
pub mod topics {
    use soroban_sdk::symbol_short;

    pub const PULSE: Symbol = symbol_short!("pulse");
    pub const FIRED: Symbol = symbol_short!("fired");
    pub const RECEIVER: Symbol = symbol_short!("receiver");
    pub const BROADCAST: Symbol = symbol_short!("broadcast");
    pub const ACK: Symbol = symbol_short!("ack");
    pub const OWNER_CHANGE: Symbol = symbol_short!("owner_chg");
    pub const PAUSE: Symbol = symbol_short!("paused");
    pub const UNPAUSE: Symbol = symbol_short!("unpaused");
    pub const BATCH: Symbol = symbol_short!("batch");
    pub const UPGRADE: Symbol = symbol_short!("upgrade");
    pub const KILL: Symbol = symbol_short!("kill");
}

/// Storage key constants
pub mod storage_keys {
    use soroban_sdk::symbol_short;

    pub const PULSE_KEY: Symbol = symbol_short!("PULSE");
    pub const META_KEY: Symbol = symbol_short!("META");
    pub const RX_PULSE_KEY: Symbol = symbol_short!("RX_PULSE");
    pub const MULTISIG_KEY: Symbol = symbol_short!("MULTISIG");
    pub const VERSION_KEY: Symbol = symbol_short!("VERSION");
}
