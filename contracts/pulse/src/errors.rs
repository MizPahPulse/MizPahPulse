//! # Error taxonomy (365 codes)
//!
//! Error codes follow a grouped taxonomy so that integrators can branch on
//! failure class without string-matching. The taxonomy is a complete,
//! machine-readable failure catalog: every code names a distinct, documented
//! failure mode — including codes the current implementation does not yet
//! raise — so client code written against the taxonomy keeps working as the
//! contract grows.
//!
//! The Stellar protocol caps the number of cases in a single spec'd error enum
//! at 50 (`ScSpecUdtErrorEnumV0.cases` is a `VecM<_, 50>`), so the taxonomy is
//! split into one [`#[contracterror]`](soroban_sdk::contracterror) enum per
//! failure class. Every enum is emitted in the contract's on-chain spec, so
//! tooling sees all 365 codes. Functions return the main [`PulseError`] type;
//! the class enums document the full numeric space.
//!
//! Ranges:
//!
//! | Range    | Class                          | Enum                            |
//! |----------|--------------------------------|---------------------------------|
//! | 1-10     | Legacy codes (kept for compat) | [`PulseError`]                  |
//! | 1xx      | Authorization & access control | [`PulseErrorAuth`]              |
//! | 2xx      | Contract lifecycle / state     | [`PulseErrorState`]             |
//! | 3xx      | Input validation               | [`PulseErrorValidation`]        |
//! | 4xx      | Limits & rate limiting         | [`PulseErrorLimits`]            |
//! | 5xx      | Time-locked operations         | [`PulseErrorTimeLock`]          |
//! | 6xx      | Payments (Stellar rails)       | [`PulseErrorPayments`]          |
//! | 7xx      | Upgrades & versioning          | [`PulseErrorUpgrade`]           |
//! | 8xx      | Storage & TTL                  | [`PulseErrorStorage`]           |
//! | 9xx      | Events & observability         | [`PulseErrorEvents`]            |
//! | 10xx     | Multi-sig & emergency          | [`PulseErrorMultisig`]          |
//! | 11xx     | Cross-contract communication   | [`PulseErrorCrossContract`]     |
//! | 12xx     | Gas & estimation               | [`PulseErrorGas`]               |
//! | 13xx     | Native rail configuration      | [`PulseErrorNativeRail`]        |
//! | 14xx     | Batch operations               | [`PulseErrorBatch`]             |
//! | 15xx     | Pause / kill safety            | [`PulseErrorPauseKill`]         |
//! | 16xx     | Per-address rate limits        | [`PulseErrorAddressLimits`]     |
//! | 17xx     | Pulse counter & cap            | [`PulseErrorCounter`]           |
//! | 18xx     | Ownership & signer management  | [`PulseErrorOwnership`]         |
//! | 19xx     | Initialization & deployment    | [`PulseErrorDeployment`]        |
//! | 20xx     | Pulse event integrity          | [`PulseErrorEventIntegrity`]    |
//! | 21xx     | Tipping (SEP-41)               | [`PulseErrorTip`]               |
//! | 22xx     | Withdrawals                    | [`PulseErrorWithdraw`]          |
//! | 23xx     | Balance & allowance            | [`PulseErrorBalanceAllowance`]  |
//! | 24xx     | Token metadata                 | [`PulseErrorTokenMeta`]         |
//! | 25xx     | XLM rail                       | [`PulseErrorXlmRail`]           |
//! | 26xx     | Batch tips                     | [`PulseErrorBatchTip`]          |
//! | 27xx     | Broadcast & ack                | [`PulseErrorBroadcast`]         |
//! | 28xx     | Configuration                  | [`PulseErrorConfig`]            |
//! | 29xx     | Reserved / system              | [`PulseErrorSystem`]            |
//!
//! The full machine-readable table (365 codes) is documented in
//! `contracts/ERRORS.md`.
use soroban_sdk::contracterror;

/// ──────────────────────────────────────────────
/// Error Codes
/// ──────────────────────────────────────────────
///
/// See the [module docs](self) for the full taxonomy and the per-class enums
/// below. Codes 1-10 are the legacy set and are kept for backward
/// compatibility.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseError {
    // ── Legacy codes 1-10 (kept for backward compatibility) ───────────
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

    // ── 1xx: Authorization & access control (class enum: PulseErrorAuth) ─
    /// Operation requires the owner, but the caller is not the owner
    NotOwner = 100,
    /// Operation requires a configured signer, but the caller is not one
    NotSigner = 101,
    /// Signer threshold for this operation was not met
    SignerThresholdNotMet = 102,
    /// No multi-sig committee is configured for this operation
    EmergencyCommitteeNotConfigured = 103,

    // ── 2xx: Contract lifecycle / state (class enum: PulseErrorState) ────
    /// `initialize` was called on an already-initialized contract
    AlreadyInitialized = 200,
    /// Operation requires initialization, but the contract is uninitialized
    NotInitialized = 201,
    /// Operation attempted after the contract was permanently killed
    ContractKilled = 202,

    // ── 3xx: Input validation (class enum: PulseErrorValidation) ─────────
    /// Signer threshold is zero or exceeds the signer set size
    InvalidThreshold = 300,
    /// The signer set contains a duplicate address
    DuplicateSigner = 301,
    /// Payment amount must be strictly positive
    InvalidAmount = 302,

    // ── 4xx: Limits & rate limiting (class enum: PulseErrorLimits) ───────
    /// `batch_pulse` requires at least one caller
    BatchEmpty = 400,
    /// A batch payment requires at least one recipient
    RecipientsEmpty = 413,

    // ── 6xx: Payments (class enum: PulseErrorPayments) ───────────────────
    /// The underlying Stellar token/SAC transfer failed
    PaymentFailed = 600,
    /// The paying address has insufficient balance for the requested amount
    InsufficientBalance = 601,
    /// The payment amount arithmetic overflowed
    AmountOverflow = 619,
    /// The spender has no allowance for the pull payment
    NoAllowance = 620,

    // ── 7xx: Upgrades (class enum: PulseErrorUpgrade) ────────────────────
    /// `upgrade_version` must be called with a version greater than the current one
    VersionNotMonotonic = 700,
}

/// 1xx — Authorization & access control.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorAuth {
    /// An authorization signature is required but was not provided
    AuthRequired = 104,
    /// The provided authorization has expired
    AuthExpired = 105,
    /// The invocation is not covered by the provided authorization
    UnauthorizedInvocation = 106,
    /// The authorized caller does not match the expected caller
    CallerMismatch = 107,
    /// Ownership has been locked and can no longer be transferred
    OwnerImmutable = 108,
    /// Operation requires an admin, but the caller is not the admin
    NotAdmin = 109,
    /// An admin signature is required but was not provided
    AdminRequired = 110,
    /// The provided signature is invalid
    SignatureInvalid = 111,
    /// The provided signature has expired
    SignatureExpired = 112,
    /// Delegated authorization failed
    DelegatedAuthFailed = 113,
    /// The authorization nonce was replayed
    NonceReplay = 114,
    /// The authorization context does not match the invocation
    AuthContextMismatch = 115,
}

/// 2xx — Contract lifecycle / state.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorState {
    /// The contract could not be initialized
    InitializeFailed = 203,
    /// On-chain state failed an integrity check
    StateCorrupted = 204,
    /// The contract does not support the requested protocol/version
    UnsupportedVersion = 205,
    /// The contract instance cannot be upgraded in its current state
    ContractNotUpgradable = 206,
    /// The requested state transition is not valid
    InvalidStateTransition = 207,
    /// The contract metadata entry is missing
    MetaMissing = 208,
    /// The contract instance data entry is missing
    InstanceDataMissing = 209,
    /// A lifecycle lock prevents the operation
    LifecycleLocked = 210,
    /// The pause state is invalid for the requested operation
    PauseStateInvalid = 211,
    /// The resume state is invalid for the requested operation
    ResumeStateInvalid = 212,
    /// The stored state version does not match expectations
    StateVersionMismatch = 213,
    /// A state migration is required before this operation
    StateMigrationRequired = 214,
}

/// 3xx — Input validation.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorValidation {
    /// A symbol exceeds the Soroban 32-byte limit
    SymbolTooLong = 303,
    /// An empty caller list was provided where one is required
    EmptyCallers = 304,
    /// The same caller appears more than once in a batch
    DuplicateCallerInBatch = 305,
    /// The provided address is not a valid contract or account address
    InvalidAddress = 306,
    /// A zero/placeholder address was provided where a real one is required
    ZeroAddress = 307,
    /// The provided token address is not a valid asset contract
    InvalidToken = 308,
    /// The provided recipient address is invalid
    InvalidRecipient = 309,
    /// The provided sender address is invalid
    InvalidSender = 310,
    /// The provided asset reference is invalid
    InvalidAsset = 311,
    /// The input payload is malformed
    MalformedInput = 312,
    /// An argument is outside its supported range
    ArgumentOutOfRange = 313,
    /// General validation failed
    ValidationFailed = 314,
}

/// 4xx — Limits & rate limiting.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorLimits {
    /// The requested batch exceeds the configured size limit
    BatchSizeLimitExceeded = 401,
    /// No rate limit is configured for the operation
    RateLimitNotConfigured = 402,
    /// Rate limiting is disabled for the operation
    RateLimitDisabled = 403,
    /// The configured interval is below the minimum supported value
    IntervalTooSmall = 404,
    /// The configured interval exceeds the maximum supported value
    IntervalTooLarge = 405,
    /// The cooldown interval cannot be zero
    CooldownZero = 406,
    /// The configured maximum is below the current counter value
    MaxCountTooSmall = 407,
    /// The configured cap value is invalid
    CapValueInvalid = 408,
    /// The counter is already at the configured cap
    CounterAtCap = 409,
    /// Two limits conflict for the same resource
    LimitConflict = 410,
    /// The cooldown window has not fully elapsed
    WindowNotElapsed = 411,
    /// The cooldown window has not started yet
    WindowNotStarted = 412,
}

/// 5xx — Time-locked operations.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorTimeLock {
    /// A time-lock window must have both bounds set
    TimeLockWindowEmpty = 500,
    /// `execute_after` is in the past
    ExecuteAfterInPast = 501,
    /// `execute_before` is in the past
    ExecuteBeforeInPast = 502,
    /// `execute_after` is later than `execute_before` (inverted window)
    WindowInverted = 503,
    /// The deadline is too close to be scheduled
    DeadlineTooSoon = 504,
    /// The operation is locked forever (no unlock timestamp)
    LockedForever = 505,
    /// The unlock timestamp entry is missing
    UnlockTimestampMissing = 506,
    /// The ledger timestamp did not advance between calls
    TimestampNotAdvancing = 507,
    /// The ledger timestamp is unavailable
    LedgerTimeUnavailable = 508,
    /// Two schedules conflict for the same resource
    ScheduleConflict = 509,
    /// The schedule has been cancelled
    ScheduleCancelled = 510,
}

/// 6xx — Payments (Stellar rails).
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorPayments {
    /// The SAC rejected the transfer
    TransferRejected = 602,
    /// The SAC `transfer_from` failed
    TransferFromFailed = 603,
    /// The spender's allowance is below the requested amount
    AllowanceExceeded = 604,
    /// The allowance has expired
    AllowanceExpired = 605,
    /// No allowance has been granted to the spender
    NoAllowance = 606,
    /// The recipient is missing the required trustline
    TrustlineMissing = 607,
    /// The asset issuer has clawed back the balance
    AssetClawback = 608,
    /// The asset is frozen/unauthorized for the address
    AssetFrozen = 609,
    /// The transfer amount overflows the balance arithmetic
    AmountOverflow = 610,
    /// The token contract does not exist
    TokenMissing = 611,
    /// The token contract is not initialized
    TokenUninitialized = 612,
    /// Payments are paused on the contract
    PaymentPaused = 613,
    /// The native rail points at a misconfigured SAC
    NativeRailMisconfigured = 614,
    /// The native rail address has not been configured
    NativeRailUnset = 615,
    /// The payment path is not supported for this asset
    PaymentPathUnsupported = 616,
    /// The transfer authorization failed
    TransferAuthFailed = 617,
    /// The balance pre-check failed
    BalanceCheckFailed = 618,
}

/// 7xx — Upgrades & versioning.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorUpgrade {
    /// The requested version exceeds the supported maximum
    VersionTooHigh = 701,
    /// The provided WASM hash is invalid
    WasmHashInvalid = 702,
    /// The WASM hash is not registered on-chain
    WasmNotRegistered = 703,
    /// Upgrades are locked on this contract
    UpgradeLocked = 704,
    /// An upgrade is already pending
    UpgradePending = 705,
    /// The version audit record is missing
    RecordMissing = 706,
    /// The version audit record failed an integrity check
    RecordCorrupted = 707,
    /// The version has reached the configured maximum
    VersionCapReached = 708,
    /// An upgrade is currently in progress
    UpgradeInProgress = 709,
    /// The WASM executable swap failed
    WasmUpdateFailed = 710,
    /// An upgrade is in its cooldown period
    UpgradeCooldown = 711,
    /// The contract spec does not match the expected spec
    SpecMismatch = 712,
}

/// 8xx — Storage & TTL.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorStorage {
    /// A storage write failed
    StorageWriteFailed = 800,
    /// A storage read failed
    StorageReadFailed = 801,
    /// A TTL extension failed
    TtlExtendFailed = 802,
    /// A storage key expired before it could be renewed
    TtlExpired = 803,
    /// The requested storage key does not exist
    KeyNotFound = 804,
    /// The storage key holds a value of a different type
    KeyTypeMismatch = 805,
    /// Instance storage is full
    InstanceDataFull = 806,
    /// Persistent storage is full
    PersistentDataFull = 807,
    /// The ledger entry exceeds the size limit
    LedgerEntryTooLarge = 808,
    /// Storage is locked for the operation
    StorageLocked = 809,
    /// The required ledger footprint was not declared
    FootprintMissing = 810,
}

/// 9xx — Events & observability.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorEvents {
    /// Publishing a contract event failed
    EventPublishFailed = 900,
    /// The event payload exceeds the size limit
    EventPayloadTooLarge = 901,
    /// An event topic exceeds the symbol length limit
    TopicTooLong = 902,
    /// The event sink is unavailable
    EventSinkUnavailable = 903,
    /// The same topic was published twice in one call
    DuplicateTopic = 904,
    /// Writing a diagnostic log failed
    LogFailed = 905,
    /// Events were emitted out of the documented order
    EventOrderingViolation = 906,
    /// The event sink is full
    EventSinkFull = 907,
    /// Diagnostics are disabled for this call
    DiagnosticsDisabled = 908,
    /// The event cannot be indexed
    EventUnindexed = 909,
}

/// 10xx — Multi-sig & emergency.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorMultisig {
    /// A required emergency signer did not authorize
    EmergencySignerNotAuthorized = 1000,
    /// The emergency threshold changed mid-operation
    EmergencyThresholdChanged = 1001,
    /// The emergency committee is empty
    CommitteeEmpty = 1002,
    /// The committee changed mid-operation
    CommitteeChanged = 1003,
    /// The emergency brake is already engaged
    EmergencyAlreadyEngaged = 1004,
    /// The emergency brake is not engaged
    EmergencyNotEngaged = 1005,
    /// The signer set is locked and cannot be changed
    SignerSetLocked = 1006,
    /// A signer was revoked mid-operation
    SignerRevoked = 1007,
    /// The same signer was authorized twice
    SignerAddedTwice = 1008,
    /// Reducing the threshold is blocked in the current state
    ThresholdReductionBlocked = 1009,
    /// The emergency window is closed
    EmergencyWindowClosed = 1010,
    /// The emergency window is not open
    EmergencyWindowNotOpen = 1011,
}

/// 11xx — Cross-contract communication.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorCrossContract {
    /// The target contract does not exist
    TargetContractNotFound = 1100,
    /// The target contract rejected the call
    TargetContractRejected = 1101,
    /// The target contract returned an unexpected response
    ResponseMismatch = 1102,
    /// The cross-contract call depth exceeded the limit
    CallDepthExceeded = 1103,
    /// A reentrant call was detected
    ReentrancyDetected = 1104,
    /// The target contract is paused
    TargetPaused = 1105,
    /// The target contract has been killed
    TargetKilled = 1106,
    /// The target contract has no such callback
    UnknownCallback = 1107,
    /// The callback payload does not match the expected shape
    CallbackPayloadMismatch = 1108,
    /// The cross-contract call failed
    CrossCallFailed = 1109,
    /// The acknowledgment from the target is missing
    AckMissing = 1110,
    /// Cross-contract broadcast is disabled
    BroadcastDisabled = 1111,
}

/// 12xx — Gas & estimation.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorGas {
    /// Gas estimation is unavailable for the operation
    EstimationUnavailable = 1200,
    /// The total host budget was exceeded
    BudgetExceeded = 1201,
    /// The CPU instruction budget was exceeded
    CpuBudgetExceeded = 1202,
    /// The memory budget was exceeded
    MemBudgetExceeded = 1203,
    /// The transaction fee is below the minimum
    FeeTooLow = 1204,
    /// The transaction fee exceeds the configured maximum
    FeeTooHigh = 1205,
    /// The instruction limit was hit
    InstructionLimitHit = 1206,
    /// The per-ledger resource limit was hit
    LedgerLimitHit = 1207,
    /// The stored gas estimate is stale
    EstimateStale = 1208,
    /// The cost model is unavailable
    CostModelUnavailable = 1209,
    /// The gas meter is disabled
    GasMeterDisabled = 1210,
}

/// 13xx — Native rail configuration.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorNativeRail {
    /// The native-token rail has not been configured
    NativeTokenNotSet = 1300,
    /// The configured native-token address is invalid
    NativeTokenInvalid = 1301,
    /// The configured native-token address is not a Stellar Asset Contract
    NativeTokenNotSac = 1302,
    /// The native-token asset is frozen
    NativeTokenFrozen = 1303,
    /// The native rail is locked against reconfiguration
    NativeRailLocked = 1304,
    /// A native-rail switch is pending
    NativeRailSwitchPending = 1305,
    /// A native-rail switch failed
    NativeRailSwitchFailed = 1306,
    /// The native-token balance is unavailable
    NativeBalanceUnavailable = 1307,
    /// Native-token transfers are unavailable
    NativeTransferUnavailable = 1308,
    /// The native rail is paused
    NativeRailPaused = 1309,
    /// The native rail is killed
    NativeRailKilled = 1310,
}

/// 14xx — Batch operations.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorBatch {
    /// A batch requires at least one caller
    BatchCallersEmpty = 1400,
    /// The batch exceeds the maximum supported size
    BatchElementsExceeded = 1401,
    /// The batch element count does not match expectations
    BatchCountMismatch = 1402,
    /// The batch contains a duplicate caller
    BatchDuplicateCaller = 1403,
    /// Part of the batch failed
    BatchPartiallyFailed = 1404,
    /// Batch atomicity was violated
    BatchAtomicityBroken = 1405,
    /// The batch total overflows the counter
    BatchTotalOverflow = 1406,
    /// The batch would exceed the pulse cap
    BatchCapExceeded = 1407,
    /// A batch requires at least one recipient
    BatchEmptyRecipients = 1408,
    /// The recipients do not match the expected count
    BatchRecipientMismatch = 1409,
    /// The batch exceeds a configured limit
    BatchLimitExceeded = 1410,
    /// The batch configuration is invalid
    BatchInvalid = 1411,
}

/// 15xx — Pause / kill safety.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorPauseKill {
    /// The contract is already paused
    AlreadyPaused = 1500,
    /// The contract is not paused
    NotPaused = 1501,
    /// The contract is already resumed
    AlreadyResumed = 1502,
    /// The contract cannot be killed while paused by emergency
    KillDisallowedWhilePaused = 1503,
    /// The contract cannot be killed while lifecycle-locked
    KillDisallowedWhileLocked = 1504,
    /// An attempt was made to resurrect a killed contract
    ResurrectionAttempted = 1505,
    /// Pausing is locked
    PauseLocked = 1506,
    /// Unpausing is locked
    UnpauseLocked = 1507,
    /// The emergency pause path is locked
    EmergencyPauseLocked = 1508,
    /// The kill switch is armed and awaiting confirmation
    KillSwitchArmed = 1509,
    /// The kill switch is disarmed
    KillSwitchDisarmed = 1510,
}

/// 16xx — Per-address rate limits.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorAddressLimits {
    /// The per-address limit entry is missing
    AddressLimitMissing = 1600,
    /// The per-address limit was cleared
    AddressLimitCleared = 1601,
    /// Two address limits conflict
    AddressLimitConflict = 1602,
    /// The address limit is below the minimum
    AddressLimitTooSmall = 1603,
    /// The address limit exceeds the maximum
    AddressLimitTooLarge = 1604,
    /// The last-pulse timestamp is missing
    LastPulseMissing = 1605,
    /// The last-pulse timestamp failed an integrity check
    LastPulseCorrupted = 1606,
    /// The address has no recorded pulse history
    AddressNotTracked = 1607,
    /// The cooldown window is already active
    WindowAlreadyActive = 1608,
    /// The cooldown window has already elapsed
    WindowAlreadyElapsed = 1609,
    /// The address limit is locked
    AddressLimitLocked = 1610,
}

/// 17xx — Pulse counter & cap.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorCounter {
    /// The pulse counter entry is missing
    CounterUninitialized = 1700,
    /// The pulse counter failed an integrity check
    CounterCorrupted = 1701,
    /// An attempt was made to decrement the counter
    CounterDecrementAttempted = 1702,
    /// The counter would roll over past `u32::MAX`
    CounterRolloverBlocked = 1703,
    /// No pulse cap is configured
    CapUnset = 1704,
    /// The counter is at or past the configured cap
    CapExceeded = 1705,
    /// The configured cap is too small
    CapTooSmall = 1706,
    /// Raising the cap is blocked in the current state
    CapRaiseBlocked = 1707,
    /// Lowering the cap is blocked in the current state
    CapLowerBlocked = 1708,
    /// The last-caller record is missing
    LastCallerMissing = 1709,
    /// The last-caller record failed an integrity check
    LastCallerCorrupted = 1710,
    /// The pulse count does not match the recorded events
    PulseCountMismatch = 1711,
}

/// 18xx — Ownership & signer management.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorOwnership {
    /// The owner entry is missing
    OwnerMissing = 1800,
    /// The owner entry failed an integrity check
    OwnerCorrupted = 1801,
    /// Ownership transfer is locked
    OwnershipTransferLocked = 1802,
    /// An ownership transfer is pending
    OwnershipTransferPending = 1803,
    /// The new owner address is invalid
    NewOwnerInvalid = 1804,
    /// The new owner is the current owner
    NewOwnerIsSelf = 1805,
    /// The signer list is missing
    SignerListMissing = 1806,
    /// The signer list failed an integrity check
    SignerListCorrupted = 1807,
    /// The signer set exceeds the size limit
    SignerLimitExceeded = 1808,
    /// The signer list is locked
    SignerListLocked = 1809,
    /// Updating the threshold is blocked in the current state
    ThresholdUpdateBlocked = 1810,
}

/// 19xx — Initialization & deployment.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorDeployment {
    /// The contract deployment failed
    DeployFailed = 1900,
    /// Uploading the contract WASM failed
    UploadFailed = 1901,
    /// The derived contract ID does not match the expected ID
    ContractIdMismatch = 1902,
    /// The deployment salt was reused
    SaltReuse = 1903,
    /// The deployer account is missing
    DeployerMissing = 1904,
    /// The contract WASM exceeds the size limit
    WasmTooLarge = 1905,
    /// The contract WASM is unexpectedly small
    WasmTooSmall = 1906,
    /// The contract WASM failed validation
    WasmCorrupted = 1907,
    /// The initialization arguments do not match the contract
    InitArgsMismatch = 1908,
    /// Initialization was aborted
    InitAborted = 1909,
    /// The deployment is still pending
    DeploymentPending = 1910,
}

/// 20xx — Pulse event integrity.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorEventIntegrity {
    /// A pulse event is missing from the expected stream
    PulseEventMissing = 2000,
    /// A pulse event failed an integrity check
    PulseEventCorrupted = 2001,
    /// Pulse events were emitted out of order
    PulseEventOrderBroken = 2002,
    /// The caller was not recorded in the event
    CallerNotRecorded = 2003,
    /// The timestamp was not recorded in the event
    TimestampNotRecorded = 2004,
    /// A gap exists in the pulse sequence
    PulseSequenceGap = 2005,
    /// A pulse sequence number was replayed
    PulseSequenceReplay = 2006,
    /// A pulse event was rejected
    PulseEventRejected = 2007,
    /// The event caller symbol does not match the recorded caller
    CallerSymbolMismatch = 2008,
    /// The counter event does not match the recorded count
    CounterEventMismatch = 2009,
    /// The event index overflows
    EventIndexOverflow = 2010,
}

/// 21xx — Tipping (SEP-41).
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorTip {
    /// The tip was rejected
    TipRejected = 2100,
    /// The tip amount is below the minimum
    TipAmountTooSmall = 2101,
    /// The tip amount exceeds the maximum
    TipAmountTooLarge = 2102,
    /// The tip payer entry is missing
    TipPayerMissing = 2103,
    /// The tip recipient entry is missing
    TipRecipientMissing = 2104,
    /// The tip payer and recipient are the same address
    TipPayerIsRecipient = 2105,
    /// The tip token address is invalid
    TipTokenInvalid = 2106,
    /// Tipping is paused
    TipPaused = 2107,
    /// The pulse fired by the tip could not be rolled back
    TipCounterRollback = 2108,
    /// The tip transfer failed
    TipTransferFailed = 2109,
    /// The tip authorization failed
    TipAuthFailed = 2110,
    /// The tip would exceed the pulse cap
    TipCapReached = 2111,
    /// Allocating the tip failed
    TipAllocationFailed = 2112,
}

/// 22xx — Withdrawals.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorWithdraw {
    /// The withdrawal was rejected
    WithdrawRejected = 2200,
    /// The withdrawal amount is below the minimum
    WithdrawAmountTooSmall = 2201,
    /// The withdrawal amount exceeds the maximum
    WithdrawAmountTooLarge = 2202,
    /// The contract holds no balance to withdraw
    WithdrawBalanceMissing = 2203,
    /// The withdrawal recipient is invalid
    WithdrawRecipientInvalid = 2204,
    /// The withdrawal token is invalid
    WithdrawTokenInvalid = 2205,
    /// Withdrawals are paused
    WithdrawPaused = 2206,
    /// The withdrawal transfer failed
    WithdrawTransferFailed = 2207,
    /// The withdrawal authorization failed
    WithdrawAuthFailed = 2208,
    /// The contract balance is zero
    WithdrawZeroBalance = 2209,
    /// Withdrawals are locked
    WithdrawLocked = 2210,
}

/// 23xx — Balance & allowance.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorBalanceAllowance {
    /// The balance query failed
    BalanceQueryFailed = 2300,
    /// The balance is unavailable
    BalanceUnavailable = 2301,
    /// The balance entry failed an integrity check
    BalanceCorrupted = 2302,
    /// The allowance query failed
    AllowanceQueryFailed = 2303,
    /// The allowance entry is missing
    AllowanceMissing = 2304,
    /// The allowance is below the requested amount
    AllowanceInsufficient = 2305,
    /// The allowance expiry was reached
    AllowanceExpiryReached = 2306,
    /// The allowance was revoked
    AllowanceRevoked = 2307,
    /// The spender entry is missing
    SpenderMissing = 2308,
    /// The spender is not authorized
    SpenderUnauthorized = 2309,
    /// The balance arithmetic overflowed
    BalanceOverflow = 2310,
    /// The balance arithmetic underflowed
    BalanceUnderflow = 2311,
    /// The balance is not tracked for this address
    BalanceNotTracked = 2312,
}

/// 24xx — Token metadata.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorTokenMeta {
    /// The token metadata query failed
    MetadataQueryFailed = 2400,
    /// The token name is unavailable
    NameUnavailable = 2401,
    /// The token symbol is unavailable
    SymbolUnavailable = 2402,
    /// The token decimals are unavailable
    DecimalsUnavailable = 2403,
    /// The asset info is unavailable
    AssetInfoUnavailable = 2404,
    /// The token version does not match expectations
    TokenVersionMismatch = 2405,
    /// The token contract is not deployed
    TokenNotDeployed = 2406,
    /// The token admin entry is missing
    TokenAdminMissing = 2407,
    /// The token is paused
    TokenPaused = 2408,
    /// The token is not supported by this contract
    TokenNotSupported = 2409,
    /// The token metadata failed an integrity check
    MetadataCorrupted = 2410,
}

/// 25xx — XLM rail.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorXlmRail {
    /// The XLM rail is unavailable
    XlmRailUnavailable = 2500,
    /// The XLM balance is unavailable
    XlmBalanceUnavailable = 2501,
    /// The XLM transfer failed
    XlmTransferFailed = 2502,
    /// The XLM withdrawal failed
    XlmWithdrawFailed = 2503,
    /// The XLM tip failed
    XlmTipFailed = 2504,
    /// The XLM rail has not been configured
    XlmRailNotConfigured = 2505,
    /// The XLM rail is locked
    XlmRailLocked = 2506,
    /// The XLM rail is paused
    XlmRailPaused = 2507,
    /// The XLM rail is killed
    XlmRailKilled = 2508,
    /// The XLM rail points at an invalid SAC
    XlmRailMisconfigured = 2509,
    /// The XLM rail asset is frozen
    XlmRailFrozen = 2510,
}

/// 26xx — Batch tips.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorBatchTip {
    /// The batch tip was rejected
    BatchTipRejected = 2600,
    /// A batch tip requires at least one recipient
    BatchTipEmpty = 2601,
    /// The batch tip exceeds the size limit
    BatchTipTooLarge = 2602,
    /// The recipients and amounts have different lengths
    BatchTipRecipientMismatch = 2603,
    /// The batch tip contains a duplicate recipient
    BatchTipDuplicateRecipient = 2604,
    /// The amounts do not match the recipients
    BatchTipAmountMismatch = 2605,
    /// Part of the batch tip failed
    BatchTipPartialFailure = 2606,
    /// The batch tip total overflows
    BatchTipTotalOverflow = 2607,
    /// The batch tip would exceed the pulse cap
    BatchTipCapExceeded = 2608,
    /// The batch tip payer is missing
    BatchTipPayerMissing = 2609,
    /// The batch tip authorization failed
    BatchTipAuthFailed = 2610,
    /// Batch tip atomicity was violated
    BatchTipAtomicityBroken = 2611,
}

/// 27xx — Broadcast & ack.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorBroadcast {
    /// The pulse broadcast failed
    BroadcastFailed = 2700,
    /// Broadcasting is paused
    BroadcastPaused = 2701,
    /// Broadcasting is killed
    BroadcastKilled = 2702,
    /// The broadcast target is missing
    BroadcastTargetMissing = 2703,
    /// The broadcast target is invalid
    BroadcastTargetInvalid = 2704,
    /// The broadcast response does not match expectations
    BroadcastResponseMismatch = 2705,
    /// The broadcast acknowledgment is missing
    BroadcastAckMissing = 2706,
    /// The broadcast acknowledgment does not match
    BroadcastAckMismatch = 2707,
    /// Broadcasting is suspended
    BroadcastSuspended = 2708,
    /// The broadcast queue is full
    BroadcastQueueFull = 2709,
    /// The broadcast was rejected
    BroadcastRejected = 2710,
}

/// 28xx — Configuration.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorConfig {
    /// The configuration entry is missing
    ConfigMissing = 2800,
    /// The configuration failed an integrity check
    ConfigCorrupted = 2801,
    /// The configuration is locked
    ConfigLocked = 2802,
    /// Two configuration values conflict
    ConfigConflict = 2803,
    /// The configuration value is out of range
    ConfigValueOutOfRange = 2804,
    /// The configuration key is unknown
    ConfigKeyUnknown = 2805,
    /// The configuration version does not match
    ConfigVersionMismatch = 2806,
    /// The configuration update is blocked
    ConfigUpdateBlocked = 2807,
    /// The configuration is read-only
    ConfigReadOnly = 2808,
    /// A configuration change is pending
    ConfigPending = 2809,
    /// The configuration was rejected
    ConfigRejected = 2810,
}

/// 29xx — Reserved / system.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PulseErrorSystem {
    /// An unexpected internal error occurred
    InternalError = 2900,
    /// Execution reached an unreachable state
    Unreachable = 2901,
    /// The requested feature is not implemented
    NotImplemented = 2902,
    /// The requested operation is not supported
    UnsupportedOperation = 2903,
    /// A contract invariant was violated
    InvariantViolation = 2904,
    /// Execution recovered from a panic
    PanicRecovery = 2905,
    /// The system is overloaded
    SystemOverload = 2906,
    /// The system is in maintenance mode
    MaintenanceMode = 2907,
    /// Reserved for future use
    Reserved = 2908,
    /// A fatal error occurred
    Fatal = 2909,
    /// An unknown error occurred
    Unknown = 2910,
}
