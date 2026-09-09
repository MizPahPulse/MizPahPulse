# PulseContract Error Codes

Machine-readable failure taxonomy of the `PulseContract` Soroban smart contract.

Every code is a distinct `ScError::Contract` value an integrator can branch on without
string-matching. Codes are globally unique across all spec'd error enums (the Stellar
protocol caps a single error enum at 50 spec cases, so the taxonomy is split into
per-class enums; every enum is emitted in the on-chain contract spec).

**Total codes: 365** (legacy 1-10, classes 1xx-29xx).

| Code | Enum | Variant | Description |
|------|------|---------|-------------|
| 1 | `PulseError` | `NotAuthorized` | Caller is not the contract owner |
| 2 | `PulseError` | `ContractPaused` | Contract is paused |
| 3 | `PulseError` | `InvalidCaller` | Invalid caller symbol (empty) |
| 4 | `PulseError` | `CounterOverflow` | Arithmetic overflow in counter |
| 5 | `PulseError` | `InvalidTargetContract` | Target contract address is invalid |
| 6 | `PulseError` | `BatchTooLarge` | Batch size exceeds maximum allowed |
| 7 | `PulseError` | `TimeLockNotReady` | Time-locked operation attempted before its scheduled timestamp |
| 8 | `PulseError` | `CooldownActive` | Rate-limited operation attempted within the active cooldown window |
| 9 | `PulseError` | `PulseCapReached` | Pulse count cap configured by the owner has been reached |
| 10 | `PulseError` | `TimeLockExpired` | Time-locked operation attempted after its absolute deadline |
| 100 | `PulseError` | `NotOwner` | Operation requires the owner, but the caller is not the owner |
| 101 | `PulseError` | `NotSigner` | Operation requires a configured signer, but the caller is not one |
| 102 | `PulseError` | `SignerThresholdNotMet` | Signer threshold for this operation was not met |
| 103 | `PulseError` | `EmergencyCommitteeNotConfigured` | No multi-sig committee is configured for this operation |
| 104 | `PulseErrorAuth` | `AuthRequired` | An authorization signature is required but was not provided |
| 105 | `PulseErrorAuth` | `AuthExpired` | The provided authorization has expired |
| 106 | `PulseErrorAuth` | `UnauthorizedInvocation` | The invocation is not covered by the provided authorization |
| 107 | `PulseErrorAuth` | `CallerMismatch` | The authorized caller does not match the expected caller |
| 108 | `PulseErrorAuth` | `OwnerImmutable` | Ownership has been locked and can no longer be transferred |
| 109 | `PulseErrorAuth` | `NotAdmin` | Operation requires an admin, but the caller is not the admin |
| 110 | `PulseErrorAuth` | `AdminRequired` | An admin signature is required but was not provided |
| 111 | `PulseErrorAuth` | `SignatureInvalid` | The provided signature is invalid |
| 112 | `PulseErrorAuth` | `SignatureExpired` | The provided signature has expired |
| 113 | `PulseErrorAuth` | `DelegatedAuthFailed` | Delegated authorization failed |
| 114 | `PulseErrorAuth` | `NonceReplay` | The authorization nonce was replayed |
| 115 | `PulseErrorAuth` | `AuthContextMismatch` | The authorization context does not match the invocation |
| 200 | `PulseError` | `AlreadyInitialized` | `initialize` was called on an already-initialized contract |
| 201 | `PulseError` | `NotInitialized` | Operation requires initialization, but the contract is uninitialized |
| 202 | `PulseError` | `ContractKilled` | Operation attempted after the contract was permanently killed |
| 203 | `PulseErrorState` | `InitializeFailed` | The contract could not be initialized |
| 204 | `PulseErrorState` | `StateCorrupted` | On-chain state failed an integrity check |
| 205 | `PulseErrorState` | `UnsupportedVersion` | The contract does not support the requested protocol/version |
| 206 | `PulseErrorState` | `ContractNotUpgradable` | The contract instance cannot be upgraded in its current state |
| 207 | `PulseErrorState` | `InvalidStateTransition` | The requested state transition is not valid |
| 208 | `PulseErrorState` | `MetaMissing` | The contract metadata entry is missing |
| 209 | `PulseErrorState` | `InstanceDataMissing` | The contract instance data entry is missing |
| 210 | `PulseErrorState` | `LifecycleLocked` | A lifecycle lock prevents the operation |
| 211 | `PulseErrorState` | `PauseStateInvalid` | The pause state is invalid for the requested operation |
| 212 | `PulseErrorState` | `ResumeStateInvalid` | The resume state is invalid for the requested operation |
| 213 | `PulseErrorState` | `StateVersionMismatch` | The stored state version does not match expectations |
| 214 | `PulseErrorState` | `StateMigrationRequired` | A state migration is required before this operation |
| 300 | `PulseError` | `InvalidThreshold` | Signer threshold is zero or exceeds the signer set size |
| 301 | `PulseError` | `DuplicateSigner` | The signer set contains a duplicate address |
| 302 | `PulseError` | `InvalidAmount` | Payment amount must be strictly positive |
| 303 | `PulseErrorValidation` | `SymbolTooLong` | A symbol exceeds the Soroban 32-byte limit |
| 304 | `PulseErrorValidation` | `EmptyCallers` | An empty caller list was provided where one is required |
| 305 | `PulseErrorValidation` | `DuplicateCallerInBatch` | The same caller appears more than once in a batch |
| 306 | `PulseErrorValidation` | `InvalidAddress` | The provided address is not a valid contract or account address |
| 307 | `PulseErrorValidation` | `ZeroAddress` | A zero/placeholder address was provided where a real one is required |
| 308 | `PulseErrorValidation` | `InvalidToken` | The provided token address is not a valid asset contract |
| 309 | `PulseErrorValidation` | `InvalidRecipient` | The provided recipient address is invalid |
| 310 | `PulseErrorValidation` | `InvalidSender` | The provided sender address is invalid |
| 311 | `PulseErrorValidation` | `InvalidAsset` | The provided asset reference is invalid |
| 312 | `PulseErrorValidation` | `MalformedInput` | The input payload is malformed |
| 313 | `PulseErrorValidation` | `ArgumentOutOfRange` | An argument is outside its supported range |
| 314 | `PulseErrorValidation` | `ValidationFailed` | General validation failed |
| 400 | `PulseError` | `BatchEmpty` | `batch_pulse` requires at least one caller |
| 401 | `PulseErrorLimits` | `BatchSizeLimitExceeded` | The requested batch exceeds the configured size limit |
| 402 | `PulseErrorLimits` | `RateLimitNotConfigured` | No rate limit is configured for the operation |
| 403 | `PulseErrorLimits` | `RateLimitDisabled` | Rate limiting is disabled for the operation |
| 404 | `PulseErrorLimits` | `IntervalTooSmall` | The configured interval is below the minimum supported value |
| 405 | `PulseErrorLimits` | `IntervalTooLarge` | The configured interval exceeds the maximum supported value |
| 406 | `PulseErrorLimits` | `CooldownZero` | The cooldown interval cannot be zero |
| 407 | `PulseErrorLimits` | `MaxCountTooSmall` | The configured maximum is below the current counter value |
| 408 | `PulseErrorLimits` | `CapValueInvalid` | The configured cap value is invalid |
| 409 | `PulseErrorLimits` | `CounterAtCap` | The counter is already at the configured cap |
| 410 | `PulseErrorLimits` | `LimitConflict` | Two limits conflict for the same resource |
| 411 | `PulseErrorLimits` | `WindowNotElapsed` | The cooldown window has not fully elapsed |
| 412 | `PulseErrorLimits` | `WindowNotStarted` | The cooldown window has not started yet |
| 413 | `PulseError` | `RecipientsEmpty` | A batch payment requires at least one recipient |
| 500 | `PulseErrorTimeLock` | `TimeLockWindowEmpty` | A time-lock window must have both bounds set |
| 501 | `PulseErrorTimeLock` | `ExecuteAfterInPast` | `execute_after` is in the past |
| 502 | `PulseErrorTimeLock` | `ExecuteBeforeInPast` | `execute_before` is in the past |
| 503 | `PulseErrorTimeLock` | `WindowInverted` | `execute_after` is later than `execute_before` (inverted window) |
| 504 | `PulseErrorTimeLock` | `DeadlineTooSoon` | The deadline is too close to be scheduled |
| 505 | `PulseErrorTimeLock` | `LockedForever` | The operation is locked forever (no unlock timestamp) |
| 506 | `PulseErrorTimeLock` | `UnlockTimestampMissing` | The unlock timestamp entry is missing |
| 507 | `PulseErrorTimeLock` | `TimestampNotAdvancing` | The ledger timestamp did not advance between calls |
| 508 | `PulseErrorTimeLock` | `LedgerTimeUnavailable` | The ledger timestamp is unavailable |
| 509 | `PulseErrorTimeLock` | `ScheduleConflict` | Two schedules conflict for the same resource |
| 510 | `PulseErrorTimeLock` | `ScheduleCancelled` | The schedule has been cancelled |
| 600 | `PulseError` | `PaymentFailed` | The underlying Stellar token/SAC transfer failed |
| 601 | `PulseError` | `InsufficientBalance` | The paying address has insufficient balance for the requested amount |
| 602 | `PulseErrorPayments` | `TransferRejected` | The SAC rejected the transfer |
| 603 | `PulseErrorPayments` | `TransferFromFailed` | The SAC `transfer_from` failed |
| 604 | `PulseErrorPayments` | `AllowanceExceeded` | The spender's allowance is below the requested amount |
| 605 | `PulseErrorPayments` | `AllowanceExpired` | The allowance has expired |
| 606 | `PulseErrorPayments` | `NoAllowance` | No allowance has been granted to the spender |
| 607 | `PulseErrorPayments` | `TrustlineMissing` | The recipient is missing the required trustline |
| 608 | `PulseErrorPayments` | `AssetClawback` | The asset issuer has clawed back the balance |
| 609 | `PulseErrorPayments` | `AssetFrozen` | The asset is frozen/unauthorized for the address |
| 610 | `PulseErrorPayments` | `AmountOverflow` | The transfer amount overflows the balance arithmetic |
| 611 | `PulseErrorPayments` | `TokenMissing` | The token contract does not exist |
| 612 | `PulseErrorPayments` | `TokenUninitialized` | The token contract is not initialized |
| 613 | `PulseErrorPayments` | `PaymentPaused` | Payments are paused on the contract |
| 614 | `PulseErrorPayments` | `NativeRailMisconfigured` | The native rail points at a misconfigured SAC |
| 615 | `PulseErrorPayments` | `NativeRailUnset` | The native rail address has not been configured |
| 616 | `PulseErrorPayments` | `PaymentPathUnsupported` | The payment path is not supported for this asset |
| 617 | `PulseErrorPayments` | `TransferAuthFailed` | The transfer authorization failed |
| 618 | `PulseErrorPayments` | `BalanceCheckFailed` | The balance pre-check failed |
| 619 | `PulseError` | `AmountOverflow` | The payment amount arithmetic overflowed |
| 620 | `PulseError` | `NoAllowance` | The spender has no allowance for the pull payment |
| 700 | `PulseError` | `VersionNotMonotonic` | `upgrade_version` must be called with a version greater than the current one |
| 701 | `PulseErrorUpgrade` | `VersionTooHigh` | The requested version exceeds the supported maximum |
| 702 | `PulseErrorUpgrade` | `WasmHashInvalid` | The provided WASM hash is invalid |
| 703 | `PulseErrorUpgrade` | `WasmNotRegistered` | The WASM hash is not registered on-chain |
| 704 | `PulseErrorUpgrade` | `UpgradeLocked` | Upgrades are locked on this contract |
| 705 | `PulseErrorUpgrade` | `UpgradePending` | An upgrade is already pending |
| 706 | `PulseErrorUpgrade` | `RecordMissing` | The version audit record is missing |
| 707 | `PulseErrorUpgrade` | `RecordCorrupted` | The version audit record failed an integrity check |
| 708 | `PulseErrorUpgrade` | `VersionCapReached` | The version has reached the configured maximum |
| 709 | `PulseErrorUpgrade` | `UpgradeInProgress` | An upgrade is currently in progress |
| 710 | `PulseErrorUpgrade` | `WasmUpdateFailed` | The WASM executable swap failed |
| 711 | `PulseErrorUpgrade` | `UpgradeCooldown` | An upgrade is in its cooldown period |
| 712 | `PulseErrorUpgrade` | `SpecMismatch` | The contract spec does not match the expected spec |
| 800 | `PulseErrorStorage` | `StorageWriteFailed` | A storage write failed |
| 801 | `PulseErrorStorage` | `StorageReadFailed` | A storage read failed |
| 802 | `PulseErrorStorage` | `TtlExtendFailed` | A TTL extension failed |
| 803 | `PulseErrorStorage` | `TtlExpired` | A storage key expired before it could be renewed |
| 804 | `PulseErrorStorage` | `KeyNotFound` | The requested storage key does not exist |
| 805 | `PulseErrorStorage` | `KeyTypeMismatch` | The storage key holds a value of a different type |
| 806 | `PulseErrorStorage` | `InstanceDataFull` | Instance storage is full |
| 807 | `PulseErrorStorage` | `PersistentDataFull` | Persistent storage is full |
| 808 | `PulseErrorStorage` | `LedgerEntryTooLarge` | The ledger entry exceeds the size limit |
| 809 | `PulseErrorStorage` | `StorageLocked` | Storage is locked for the operation |
| 810 | `PulseErrorStorage` | `FootprintMissing` | The required ledger footprint was not declared |
| 900 | `PulseErrorEvents` | `EventPublishFailed` | Publishing a contract event failed |
| 901 | `PulseErrorEvents` | `EventPayloadTooLarge` | The event payload exceeds the size limit |
| 902 | `PulseErrorEvents` | `TopicTooLong` | An event topic exceeds the symbol length limit |
| 903 | `PulseErrorEvents` | `EventSinkUnavailable` | The event sink is unavailable |
| 904 | `PulseErrorEvents` | `DuplicateTopic` | The same topic was published twice in one call |
| 905 | `PulseErrorEvents` | `LogFailed` | Writing a diagnostic log failed |
| 906 | `PulseErrorEvents` | `EventOrderingViolation` | Events were emitted out of the documented order |
| 907 | `PulseErrorEvents` | `EventSinkFull` | The event sink is full |
| 908 | `PulseErrorEvents` | `DiagnosticsDisabled` | Diagnostics are disabled for this call |
| 909 | `PulseErrorEvents` | `EventUnindexed` | The event cannot be indexed |
| 1000 | `PulseErrorMultisig` | `EmergencySignerNotAuthorized` | A required emergency signer did not authorize |
| 1001 | `PulseErrorMultisig` | `EmergencyThresholdChanged` | The emergency threshold changed mid-operation |
| 1002 | `PulseErrorMultisig` | `CommitteeEmpty` | The emergency committee is empty |
| 1003 | `PulseErrorMultisig` | `CommitteeChanged` | The committee changed mid-operation |
| 1004 | `PulseErrorMultisig` | `EmergencyAlreadyEngaged` | The emergency brake is already engaged |
| 1005 | `PulseErrorMultisig` | `EmergencyNotEngaged` | The emergency brake is not engaged |
| 1006 | `PulseErrorMultisig` | `SignerSetLocked` | The signer set is locked and cannot be changed |
| 1007 | `PulseErrorMultisig` | `SignerRevoked` | A signer was revoked mid-operation |
| 1008 | `PulseErrorMultisig` | `SignerAddedTwice` | The same signer was authorized twice |
| 1009 | `PulseErrorMultisig` | `ThresholdReductionBlocked` | Reducing the threshold is blocked in the current state |
| 1010 | `PulseErrorMultisig` | `EmergencyWindowClosed` | The emergency window is closed |
| 1011 | `PulseErrorMultisig` | `EmergencyWindowNotOpen` | The emergency window is not open |
| 1100 | `PulseErrorCrossContract` | `TargetContractNotFound` | The target contract does not exist |
| 1101 | `PulseErrorCrossContract` | `TargetContractRejected` | The target contract rejected the call |
| 1102 | `PulseErrorCrossContract` | `ResponseMismatch` | The target contract returned an unexpected response |
| 1103 | `PulseErrorCrossContract` | `CallDepthExceeded` | The cross-contract call depth exceeded the limit |
| 1104 | `PulseErrorCrossContract` | `ReentrancyDetected` | A reentrant call was detected |
| 1105 | `PulseErrorCrossContract` | `TargetPaused` | The target contract is paused |
| 1106 | `PulseErrorCrossContract` | `TargetKilled` | The target contract has been killed |
| 1107 | `PulseErrorCrossContract` | `UnknownCallback` | The target contract has no such callback |
| 1108 | `PulseErrorCrossContract` | `CallbackPayloadMismatch` | The callback payload does not match the expected shape |
| 1109 | `PulseErrorCrossContract` | `CrossCallFailed` | The cross-contract call failed |
| 1110 | `PulseErrorCrossContract` | `AckMissing` | The acknowledgment from the target is missing |
| 1111 | `PulseErrorCrossContract` | `BroadcastDisabled` | Cross-contract broadcast is disabled |
| 1200 | `PulseErrorGas` | `EstimationUnavailable` | Gas estimation is unavailable for the operation |
| 1201 | `PulseErrorGas` | `BudgetExceeded` | The total host budget was exceeded |
| 1202 | `PulseErrorGas` | `CpuBudgetExceeded` | The CPU instruction budget was exceeded |
| 1203 | `PulseErrorGas` | `MemBudgetExceeded` | The memory budget was exceeded |
| 1204 | `PulseErrorGas` | `FeeTooLow` | The transaction fee is below the minimum |
| 1205 | `PulseErrorGas` | `FeeTooHigh` | The transaction fee exceeds the configured maximum |
| 1206 | `PulseErrorGas` | `InstructionLimitHit` | The instruction limit was hit |
| 1207 | `PulseErrorGas` | `LedgerLimitHit` | The per-ledger resource limit was hit |
| 1208 | `PulseErrorGas` | `EstimateStale` | The stored gas estimate is stale |
| 1209 | `PulseErrorGas` | `CostModelUnavailable` | The cost model is unavailable |
| 1210 | `PulseErrorGas` | `GasMeterDisabled` | The gas meter is disabled |
| 1300 | `PulseErrorNativeRail` | `NativeTokenNotSet` | The native-token rail has not been configured |
| 1301 | `PulseErrorNativeRail` | `NativeTokenInvalid` | The configured native-token address is invalid |
| 1302 | `PulseErrorNativeRail` | `NativeTokenNotSac` | The configured native-token address is not a Stellar Asset Contract |
| 1303 | `PulseErrorNativeRail` | `NativeTokenFrozen` | The native-token asset is frozen |
| 1304 | `PulseErrorNativeRail` | `NativeRailLocked` | The native rail is locked against reconfiguration |
| 1305 | `PulseErrorNativeRail` | `NativeRailSwitchPending` | A native-rail switch is pending |
| 1306 | `PulseErrorNativeRail` | `NativeRailSwitchFailed` | A native-rail switch failed |
| 1307 | `PulseErrorNativeRail` | `NativeBalanceUnavailable` | The native-token balance is unavailable |
| 1308 | `PulseErrorNativeRail` | `NativeTransferUnavailable` | Native-token transfers are unavailable |
| 1309 | `PulseErrorNativeRail` | `NativeRailPaused` | The native rail is paused |
| 1310 | `PulseErrorNativeRail` | `NativeRailKilled` | The native rail is killed |
| 1400 | `PulseErrorBatch` | `BatchCallersEmpty` | A batch requires at least one caller |
| 1401 | `PulseErrorBatch` | `BatchElementsExceeded` | The batch exceeds the maximum supported size |
| 1402 | `PulseErrorBatch` | `BatchCountMismatch` | The batch element count does not match expectations |
| 1403 | `PulseErrorBatch` | `BatchDuplicateCaller` | The batch contains a duplicate caller |
| 1404 | `PulseErrorBatch` | `BatchPartiallyFailed` | Part of the batch failed |
| 1405 | `PulseErrorBatch` | `BatchAtomicityBroken` | Batch atomicity was violated |
| 1406 | `PulseErrorBatch` | `BatchTotalOverflow` | The batch total overflows the counter |
| 1407 | `PulseErrorBatch` | `BatchCapExceeded` | The batch would exceed the pulse cap |
| 1408 | `PulseErrorBatch` | `BatchEmptyRecipients` | A batch requires at least one recipient |
| 1409 | `PulseErrorBatch` | `BatchRecipientMismatch` | The recipients do not match the expected count |
| 1410 | `PulseErrorBatch` | `BatchLimitExceeded` | The batch exceeds a configured limit |
| 1411 | `PulseErrorBatch` | `BatchInvalid` | The batch configuration is invalid |
| 1500 | `PulseErrorPauseKill` | `AlreadyPaused` | The contract is already paused |
| 1501 | `PulseErrorPauseKill` | `NotPaused` | The contract is not paused |
| 1502 | `PulseErrorPauseKill` | `AlreadyResumed` | The contract is already resumed |
| 1503 | `PulseErrorPauseKill` | `KillDisallowedWhilePaused` | The contract cannot be killed while paused by emergency |
| 1504 | `PulseErrorPauseKill` | `KillDisallowedWhileLocked` | The contract cannot be killed while lifecycle-locked |
| 1505 | `PulseErrorPauseKill` | `ResurrectionAttempted` | An attempt was made to resurrect a killed contract |
| 1506 | `PulseErrorPauseKill` | `PauseLocked` | Pausing is locked |
| 1507 | `PulseErrorPauseKill` | `UnpauseLocked` | Unpausing is locked |
| 1508 | `PulseErrorPauseKill` | `EmergencyPauseLocked` | The emergency pause path is locked |
| 1509 | `PulseErrorPauseKill` | `KillSwitchArmed` | The kill switch is armed and awaiting confirmation |
| 1510 | `PulseErrorPauseKill` | `KillSwitchDisarmed` | The kill switch is disarmed |
| 1600 | `PulseErrorAddressLimits` | `AddressLimitMissing` | The per-address limit entry is missing |
| 1601 | `PulseErrorAddressLimits` | `AddressLimitCleared` | The per-address limit was cleared |
| 1602 | `PulseErrorAddressLimits` | `AddressLimitConflict` | Two address limits conflict |
| 1603 | `PulseErrorAddressLimits` | `AddressLimitTooSmall` | The address limit is below the minimum |
| 1604 | `PulseErrorAddressLimits` | `AddressLimitTooLarge` | The address limit exceeds the maximum |
| 1605 | `PulseErrorAddressLimits` | `LastPulseMissing` | The last-pulse timestamp is missing |
| 1606 | `PulseErrorAddressLimits` | `LastPulseCorrupted` | The last-pulse timestamp failed an integrity check |
| 1607 | `PulseErrorAddressLimits` | `AddressNotTracked` | The address has no recorded pulse history |
| 1608 | `PulseErrorAddressLimits` | `WindowAlreadyActive` | The cooldown window is already active |
| 1609 | `PulseErrorAddressLimits` | `WindowAlreadyElapsed` | The cooldown window has already elapsed |
| 1610 | `PulseErrorAddressLimits` | `AddressLimitLocked` | The address limit is locked |
| 1700 | `PulseErrorCounter` | `CounterUninitialized` | The pulse counter entry is missing |
| 1701 | `PulseErrorCounter` | `CounterCorrupted` | The pulse counter failed an integrity check |
| 1702 | `PulseErrorCounter` | `CounterDecrementAttempted` | An attempt was made to decrement the counter |
| 1703 | `PulseErrorCounter` | `CounterRolloverBlocked` | The counter would roll over past `u32::MAX` |
| 1704 | `PulseErrorCounter` | `CapUnset` | No pulse cap is configured |
| 1705 | `PulseErrorCounter` | `CapExceeded` | The counter is at or past the configured cap |
| 1706 | `PulseErrorCounter` | `CapTooSmall` | The configured cap is too small |
| 1707 | `PulseErrorCounter` | `CapRaiseBlocked` | Raising the cap is blocked in the current state |
| 1708 | `PulseErrorCounter` | `CapLowerBlocked` | Lowering the cap is blocked in the current state |
| 1709 | `PulseErrorCounter` | `LastCallerMissing` | The last-caller record is missing |
| 1710 | `PulseErrorCounter` | `LastCallerCorrupted` | The last-caller record failed an integrity check |
| 1711 | `PulseErrorCounter` | `PulseCountMismatch` | The pulse count does not match the recorded events |
| 1800 | `PulseErrorOwnership` | `OwnerMissing` | The owner entry is missing |
| 1801 | `PulseErrorOwnership` | `OwnerCorrupted` | The owner entry failed an integrity check |
| 1802 | `PulseErrorOwnership` | `OwnershipTransferLocked` | Ownership transfer is locked |
| 1803 | `PulseErrorOwnership` | `OwnershipTransferPending` | An ownership transfer is pending |
| 1804 | `PulseErrorOwnership` | `NewOwnerInvalid` | The new owner address is invalid |
| 1805 | `PulseErrorOwnership` | `NewOwnerIsSelf` | The new owner is the current owner |
| 1806 | `PulseErrorOwnership` | `SignerListMissing` | The signer list is missing |
| 1807 | `PulseErrorOwnership` | `SignerListCorrupted` | The signer list failed an integrity check |
| 1808 | `PulseErrorOwnership` | `SignerLimitExceeded` | The signer set exceeds the size limit |
| 1809 | `PulseErrorOwnership` | `SignerListLocked` | The signer list is locked |
| 1810 | `PulseErrorOwnership` | `ThresholdUpdateBlocked` | Updating the threshold is blocked in the current state |
| 1900 | `PulseErrorDeployment` | `DeployFailed` | The contract deployment failed |
| 1901 | `PulseErrorDeployment` | `UploadFailed` | Uploading the contract WASM failed |
| 1902 | `PulseErrorDeployment` | `ContractIdMismatch` | The derived contract ID does not match the expected ID |
| 1903 | `PulseErrorDeployment` | `SaltReuse` | The deployment salt was reused |
| 1904 | `PulseErrorDeployment` | `DeployerMissing` | The deployer account is missing |
| 1905 | `PulseErrorDeployment` | `WasmTooLarge` | The contract WASM exceeds the size limit |
| 1906 | `PulseErrorDeployment` | `WasmTooSmall` | The contract WASM is unexpectedly small |
| 1907 | `PulseErrorDeployment` | `WasmCorrupted` | The contract WASM failed validation |
| 1908 | `PulseErrorDeployment` | `InitArgsMismatch` | The initialization arguments do not match the contract |
| 1909 | `PulseErrorDeployment` | `InitAborted` | Initialization was aborted |
| 1910 | `PulseErrorDeployment` | `DeploymentPending` | The deployment is still pending |
| 2000 | `PulseErrorEventIntegrity` | `PulseEventMissing` | A pulse event is missing from the expected stream |
| 2001 | `PulseErrorEventIntegrity` | `PulseEventCorrupted` | A pulse event failed an integrity check |
| 2002 | `PulseErrorEventIntegrity` | `PulseEventOrderBroken` | Pulse events were emitted out of order |
| 2003 | `PulseErrorEventIntegrity` | `CallerNotRecorded` | The caller was not recorded in the event |
| 2004 | `PulseErrorEventIntegrity` | `TimestampNotRecorded` | The timestamp was not recorded in the event |
| 2005 | `PulseErrorEventIntegrity` | `PulseSequenceGap` | A gap exists in the pulse sequence |
| 2006 | `PulseErrorEventIntegrity` | `PulseSequenceReplay` | A pulse sequence number was replayed |
| 2007 | `PulseErrorEventIntegrity` | `PulseEventRejected` | A pulse event was rejected |
| 2008 | `PulseErrorEventIntegrity` | `CallerSymbolMismatch` | The event caller symbol does not match the recorded caller |
| 2009 | `PulseErrorEventIntegrity` | `CounterEventMismatch` | The counter event does not match the recorded count |
| 2010 | `PulseErrorEventIntegrity` | `EventIndexOverflow` | The event index overflows |
| 2100 | `PulseErrorTip` | `TipRejected` | The tip was rejected |
| 2101 | `PulseErrorTip` | `TipAmountTooSmall` | The tip amount is below the minimum |
| 2102 | `PulseErrorTip` | `TipAmountTooLarge` | The tip amount exceeds the maximum |
| 2103 | `PulseErrorTip` | `TipPayerMissing` | The tip payer entry is missing |
| 2104 | `PulseErrorTip` | `TipRecipientMissing` | The tip recipient entry is missing |
| 2105 | `PulseErrorTip` | `TipPayerIsRecipient` | The tip payer and recipient are the same address |
| 2106 | `PulseErrorTip` | `TipTokenInvalid` | The tip token address is invalid |
| 2107 | `PulseErrorTip` | `TipPaused` | Tipping is paused |
| 2108 | `PulseErrorTip` | `TipCounterRollback` | The pulse fired by the tip could not be rolled back |
| 2109 | `PulseErrorTip` | `TipTransferFailed` | The tip transfer failed |
| 2110 | `PulseErrorTip` | `TipAuthFailed` | The tip authorization failed |
| 2111 | `PulseErrorTip` | `TipCapReached` | The tip would exceed the pulse cap |
| 2112 | `PulseErrorTip` | `TipAllocationFailed` | Allocating the tip failed |
| 2200 | `PulseErrorWithdraw` | `WithdrawRejected` | The withdrawal was rejected |
| 2201 | `PulseErrorWithdraw` | `WithdrawAmountTooSmall` | The withdrawal amount is below the minimum |
| 2202 | `PulseErrorWithdraw` | `WithdrawAmountTooLarge` | The withdrawal amount exceeds the maximum |
| 2203 | `PulseErrorWithdraw` | `WithdrawBalanceMissing` | The contract holds no balance to withdraw |
| 2204 | `PulseErrorWithdraw` | `WithdrawRecipientInvalid` | The withdrawal recipient is invalid |
| 2205 | `PulseErrorWithdraw` | `WithdrawTokenInvalid` | The withdrawal token is invalid |
| 2206 | `PulseErrorWithdraw` | `WithdrawPaused` | Withdrawals are paused |
| 2207 | `PulseErrorWithdraw` | `WithdrawTransferFailed` | The withdrawal transfer failed |
| 2208 | `PulseErrorWithdraw` | `WithdrawAuthFailed` | The withdrawal authorization failed |
| 2209 | `PulseErrorWithdraw` | `WithdrawZeroBalance` | The contract balance is zero |
| 2210 | `PulseErrorWithdraw` | `WithdrawLocked` | Withdrawals are locked |
| 2300 | `PulseErrorBalanceAllowance` | `BalanceQueryFailed` | The balance query failed |
| 2301 | `PulseErrorBalanceAllowance` | `BalanceUnavailable` | The balance is unavailable |
| 2302 | `PulseErrorBalanceAllowance` | `BalanceCorrupted` | The balance entry failed an integrity check |
| 2303 | `PulseErrorBalanceAllowance` | `AllowanceQueryFailed` | The allowance query failed |
| 2304 | `PulseErrorBalanceAllowance` | `AllowanceMissing` | The allowance entry is missing |
| 2305 | `PulseErrorBalanceAllowance` | `AllowanceInsufficient` | The allowance is below the requested amount |
| 2306 | `PulseErrorBalanceAllowance` | `AllowanceExpiryReached` | The allowance expiry was reached |
| 2307 | `PulseErrorBalanceAllowance` | `AllowanceRevoked` | The allowance was revoked |
| 2308 | `PulseErrorBalanceAllowance` | `SpenderMissing` | The spender entry is missing |
| 2309 | `PulseErrorBalanceAllowance` | `SpenderUnauthorized` | The spender is not authorized |
| 2310 | `PulseErrorBalanceAllowance` | `BalanceOverflow` | The balance arithmetic overflowed |
| 2311 | `PulseErrorBalanceAllowance` | `BalanceUnderflow` | The balance arithmetic underflowed |
| 2312 | `PulseErrorBalanceAllowance` | `BalanceNotTracked` | The balance is not tracked for this address |
| 2400 | `PulseErrorTokenMeta` | `MetadataQueryFailed` | The token metadata query failed |
| 2401 | `PulseErrorTokenMeta` | `NameUnavailable` | The token name is unavailable |
| 2402 | `PulseErrorTokenMeta` | `SymbolUnavailable` | The token symbol is unavailable |
| 2403 | `PulseErrorTokenMeta` | `DecimalsUnavailable` | The token decimals are unavailable |
| 2404 | `PulseErrorTokenMeta` | `AssetInfoUnavailable` | The asset info is unavailable |
| 2405 | `PulseErrorTokenMeta` | `TokenVersionMismatch` | The token version does not match expectations |
| 2406 | `PulseErrorTokenMeta` | `TokenNotDeployed` | The token contract is not deployed |
| 2407 | `PulseErrorTokenMeta` | `TokenAdminMissing` | The token admin entry is missing |
| 2408 | `PulseErrorTokenMeta` | `TokenPaused` | The token is paused |
| 2409 | `PulseErrorTokenMeta` | `TokenNotSupported` | The token is not supported by this contract |
| 2410 | `PulseErrorTokenMeta` | `MetadataCorrupted` | The token metadata failed an integrity check |
| 2500 | `PulseErrorXlmRail` | `XlmRailUnavailable` | The XLM rail is unavailable |
| 2501 | `PulseErrorXlmRail` | `XlmBalanceUnavailable` | The XLM balance is unavailable |
| 2502 | `PulseErrorXlmRail` | `XlmTransferFailed` | The XLM transfer failed |
| 2503 | `PulseErrorXlmRail` | `XlmWithdrawFailed` | The XLM withdrawal failed |
| 2504 | `PulseErrorXlmRail` | `XlmTipFailed` | The XLM tip failed |
| 2505 | `PulseErrorXlmRail` | `XlmRailNotConfigured` | The XLM rail has not been configured |
| 2506 | `PulseErrorXlmRail` | `XlmRailLocked` | The XLM rail is locked |
| 2507 | `PulseErrorXlmRail` | `XlmRailPaused` | The XLM rail is paused |
| 2508 | `PulseErrorXlmRail` | `XlmRailKilled` | The XLM rail is killed |
| 2509 | `PulseErrorXlmRail` | `XlmRailMisconfigured` | The XLM rail points at an invalid SAC |
| 2510 | `PulseErrorXlmRail` | `XlmRailFrozen` | The XLM rail asset is frozen |
| 2600 | `PulseErrorBatchTip` | `BatchTipRejected` | The batch tip was rejected |
| 2601 | `PulseErrorBatchTip` | `BatchTipEmpty` | A batch tip requires at least one recipient |
| 2602 | `PulseErrorBatchTip` | `BatchTipTooLarge` | The batch tip exceeds the size limit |
| 2603 | `PulseErrorBatchTip` | `BatchTipRecipientMismatch` | The recipients and amounts have different lengths |
| 2604 | `PulseErrorBatchTip` | `BatchTipDuplicateRecipient` | The batch tip contains a duplicate recipient |
| 2605 | `PulseErrorBatchTip` | `BatchTipAmountMismatch` | The amounts do not match the recipients |
| 2606 | `PulseErrorBatchTip` | `BatchTipPartialFailure` | Part of the batch tip failed |
| 2607 | `PulseErrorBatchTip` | `BatchTipTotalOverflow` | The batch tip total overflows |
| 2608 | `PulseErrorBatchTip` | `BatchTipCapExceeded` | The batch tip would exceed the pulse cap |
| 2609 | `PulseErrorBatchTip` | `BatchTipPayerMissing` | The batch tip payer is missing |
| 2610 | `PulseErrorBatchTip` | `BatchTipAuthFailed` | The batch tip authorization failed |
| 2611 | `PulseErrorBatchTip` | `BatchTipAtomicityBroken` | Batch tip atomicity was violated |
| 2700 | `PulseErrorBroadcast` | `BroadcastFailed` | The pulse broadcast failed |
| 2701 | `PulseErrorBroadcast` | `BroadcastPaused` | Broadcasting is paused |
| 2702 | `PulseErrorBroadcast` | `BroadcastKilled` | Broadcasting is killed |
| 2703 | `PulseErrorBroadcast` | `BroadcastTargetMissing` | The broadcast target is missing |
| 2704 | `PulseErrorBroadcast` | `BroadcastTargetInvalid` | The broadcast target is invalid |
| 2705 | `PulseErrorBroadcast` | `BroadcastResponseMismatch` | The broadcast response does not match expectations |
| 2706 | `PulseErrorBroadcast` | `BroadcastAckMissing` | The broadcast acknowledgment is missing |
| 2707 | `PulseErrorBroadcast` | `BroadcastAckMismatch` | The broadcast acknowledgment does not match |
| 2708 | `PulseErrorBroadcast` | `BroadcastSuspended` | Broadcasting is suspended |
| 2709 | `PulseErrorBroadcast` | `BroadcastQueueFull` | The broadcast queue is full |
| 2710 | `PulseErrorBroadcast` | `BroadcastRejected` | The broadcast was rejected |
| 2800 | `PulseErrorConfig` | `ConfigMissing` | The configuration entry is missing |
| 2801 | `PulseErrorConfig` | `ConfigCorrupted` | The configuration failed an integrity check |
| 2802 | `PulseErrorConfig` | `ConfigLocked` | The configuration is locked |
| 2803 | `PulseErrorConfig` | `ConfigConflict` | Two configuration values conflict |
| 2804 | `PulseErrorConfig` | `ConfigValueOutOfRange` | The configuration value is out of range |
| 2805 | `PulseErrorConfig` | `ConfigKeyUnknown` | The configuration key is unknown |
| 2806 | `PulseErrorConfig` | `ConfigVersionMismatch` | The configuration version does not match |
| 2807 | `PulseErrorConfig` | `ConfigUpdateBlocked` | The configuration update is blocked |
| 2808 | `PulseErrorConfig` | `ConfigReadOnly` | The configuration is read-only |
| 2809 | `PulseErrorConfig` | `ConfigPending` | A configuration change is pending |
| 2810 | `PulseErrorConfig` | `ConfigRejected` | The configuration was rejected |
| 2900 | `PulseErrorSystem` | `InternalError` | An unexpected internal error occurred |
| 2901 | `PulseErrorSystem` | `Unreachable` | Execution reached an unreachable state |
| 2902 | `PulseErrorSystem` | `NotImplemented` | The requested feature is not implemented |
| 2903 | `PulseErrorSystem` | `UnsupportedOperation` | The requested operation is not supported |
| 2904 | `PulseErrorSystem` | `InvariantViolation` | A contract invariant was violated |
| 2905 | `PulseErrorSystem` | `PanicRecovery` | Execution recovered from a panic |
| 2906 | `PulseErrorSystem` | `SystemOverload` | The system is overloaded |
| 2907 | `PulseErrorSystem` | `MaintenanceMode` | The system is in maintenance mode |
| 2908 | `PulseErrorSystem` | `Reserved` | Reserved for future use |
| 2909 | `PulseErrorSystem` | `Fatal` | A fatal error occurred |
| 2910 | `PulseErrorSystem` | `Unknown` | An unknown error occurred |
