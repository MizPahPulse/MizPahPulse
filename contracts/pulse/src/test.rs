#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Events;
use soroban_sdk::testutils::Ledger;
use soroban_sdk::Env;

fn deploy(env: &Env) -> (Address, PulseContractClient) {
    let contract_id = env.register_contract(None, PulseContract);
    let client = PulseContractClient::new(env, &contract_id);
    (contract_id, client)
}

fn deploy_initialized<'a>(env: &'a Env, owner: &Address) -> (Address, PulseContractClient<'a>) {
    let (contract_id, client) = deploy(env);
    client.initialize(owner);
    (contract_id, client)
}

fn make_owner(env: &Env) -> Address {
    // Register a dummy contract to get a valid Address for testing
    let dummy_id = env.register_contract(None, PulseContract);
    dummy_id
}

#[test]
fn test_initialize_sets_owner() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy(&env);

    client.initialize(&owner);

    let stored = client.owner();
    assert_eq!(stored, Some(owner.clone()));

    let meta = client.get_meta();
    assert!(meta.is_some());
    let meta = meta.unwrap();
    assert_eq!(meta.owner, owner);
    assert!(!meta.paused);
    assert_eq!(meta.version, 1);
}

#[test]
fn test_initialize_idempotent() {
    let env = Env::default();
    // Deploy a second contract to use its address as a different owner
    let other_contract_id = env.register_contract(None, PulseContract);
    let owner1 = make_owner(&env);
    let owner2 = other_contract_id.clone();
    let (_id, client) = deploy(&env);

    client.initialize(&owner1);
    client.initialize(&owner2); // Should not change owner

    assert_eq!(client.owner(), Some(owner1));
}

#[test]
fn test_pulse_increments_count() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    assert_eq!(client.get_pulse_count(), 0);

    let count1 = client.pulse(&symbol_short!("alice"));
    assert_eq!(count1, 1u32);

    let count2 = client.pulse(&symbol_short!("bob"));
    assert_eq!(count2, 2u32);

    let data = client.get_pulse_data();
    assert_eq!(data.count, 2);
    assert_eq!(data.last_caller, Some(symbol_short!("bob")));
    assert!(data.last_pulse_at.is_some());
}

#[test]
fn test_pulse_emits_event_with_topics() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    let _count = client.pulse(&symbol_short!("alice"));

    let events = env.events().all();
    assert!(!events.is_empty(), "Should have emitted at least one event");
}

#[test]
fn test_pulse_rejects_empty_caller() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    let result = client.try_pulse(&Symbol::new(&env, ""));
    assert!(result.is_err());
}

#[test]
fn test_pause_and_unpause() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    // Mock all auths for the owner
    env.mock_all_auths();

    assert!(!client.is_paused());
    client.pause();
    assert!(client.is_paused());

    let result = client.try_pulse(&symbol_short!("alice"));
    assert!(result.is_err());

    client.unpause();
    assert!(!client.is_paused());

    let result = client.pulse(&symbol_short!("bob"));
    assert_eq!(result, 1u32);
}

#[test]
fn test_pause_idempotent() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    env.mock_all_auths();
    client.pause();
    client.pause();
    assert!(client.is_paused());
}

#[test]
fn test_transfer_ownership() {
    let env = Env::default();
    let owner = make_owner(&env);
    // Use another deployed contract's address as the new owner
    let new_owner_id = env.register_contract(None, PulseContract);
    let new_owner = new_owner_id.clone();
    let (_id, client) = deploy_initialized(&env, &owner);

    env.mock_all_auths();
    assert_eq!(client.owner(), Some(owner.clone()));
    client.transfer_ownership(&new_owner);
    assert_eq!(client.owner(), Some(new_owner.clone()));
}

#[test]
fn test_batch_pulse() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    let callers = Vec::from_array(
        &env,
        [
            symbol_short!("alice"),
            symbol_short!("bob"),
            symbol_short!("charlie"),
        ],
    );

    let result = client.batch_pulse(&callers);
    assert_eq!(result, 3u32);

    let data = client.get_pulse_data();
    assert_eq!(data.count, 3);
    assert_eq!(data.last_caller, Some(symbol_short!("charlie")));
}

#[test]
fn test_batch_pulse_empty() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    let empty: Vec<Symbol> = Vec::new(&env);
    let result = client.try_batch_pulse(&empty);
    assert!(result.is_err());
}

#[test]
fn test_batch_pulse_respects_max_size() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    let mut callers = Vec::new(&env);
    for _i in 0..51u32 {
        callers.push_back(symbol_short!("test"));
    }

    let result = client.try_batch_pulse(&callers);
    assert!(result.is_err());
}

#[test]
fn test_batch_pulse_paused() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    env.mock_all_auths();
    client.pause();

    let callers = Vec::from_array(&env, [symbol_short!("alice")]);
    let result = client.try_batch_pulse(&callers);
    assert!(result.is_err());
}

#[test]
fn test_get_pulse_count_initial() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    assert_eq!(client.get_pulse_count(), 0);
}

#[test]
fn test_get_pulse_data_initial() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    let data = client.get_pulse_data();
    assert_eq!(data.count, 0);
    assert_eq!(data.last_caller, None);
    assert_eq!(data.last_pulse_at, None);
}

#[test]
fn test_inter_contract_communication() {
    let env = Env::default();
    let owner = make_owner(&env);

    let contract_a_id = env.register_contract(None, PulseContract);
    let contract_b_id = env.register_contract(None, PulseContract);

    let client_a = PulseContractClient::new(&env, &contract_a_id);
    let client_b = PulseContractClient::new(&env, &contract_b_id);

    client_a.initialize(&owner);
    client_b.initialize(&owner);

    let (count, _result) = client_a.broadcast_pulse(&contract_b_id, &symbol_short!("alice"));
    assert_eq!(count, 1u32);

    let received = client_b.get_last_received();
    assert!(received.is_some());
    let (rx_count, rx_caller) = received.unwrap();
    assert_eq!(rx_count, 1);
    assert_eq!(rx_caller, symbol_short!("alice"));
}

#[test]
fn test_on_pulse_received_direct() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    let response = client.on_pulse_received(&5u32, &symbol_short!("bob"));
    assert_eq!(response, symbol_short!("ACK"));

    let received = client.get_last_received();
    assert!(received.is_some());
    let (count, caller) = received.unwrap();
    assert_eq!(count, 5);
    assert_eq!(caller, symbol_short!("bob"));
}

#[test]
fn test_get_last_received_initial() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    assert!(client.get_last_received().is_none());
}

#[test]
fn test_counter_overflow_protection() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    env.as_contract(&_id, || {
        env.storage().instance().set(
            &PULSE_KEY,
            &PulseData {
                count: u32::MAX,
                last_caller: None,
                last_pulse_at: None,
            },
        );
    });

    let result = client.try_pulse(&symbol_short!("alice"));
    assert!(result.is_err());
}

#[test]
fn test_pulse_count_persists_across_calls() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    let callers = ["alice", "bob", "charlie", "dave", "eve"];
    for (i, caller) in callers.iter().enumerate() {
        let count = client.pulse(&Symbol::new(&env, caller));
        assert_eq!(count, (i + 1) as u32);
    }

    assert_eq!(client.get_pulse_count(), 5);
}

#[test]
fn test_uninitialized_contract_has_no_owner() {
    let env = Env::default();
    let (_id, client) = deploy(&env);

    assert!(client.owner().is_none());
    assert!(client.get_meta().is_none());
}

fn upload_test_wasm(env: &Env) -> soroban_sdk::BytesN<32> {
    // Arbitrary hash — upgrade_version records it without executing a swap.
    soroban_sdk::BytesN::from_array(env, &[7u8; 32])
}

#[test]
fn test_upgrade_version() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);
    env.mock_all_auths();

    let hash = upload_test_wasm(&env);

    client.upgrade_version(&3u32, &hash);

    let meta = client.get_meta().unwrap();
    assert_eq!(meta.version, 3);

    let record = client.get_version_record();
    assert!(record.is_some());
    // The record must carry the hash we upgraded to, not the previous one.
    assert_eq!(record.unwrap().new_wasm_hash, hash);
}

#[test]
fn test_upgrade_rejects_downgrade() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);
    env.mock_all_auths();

    let hash = upload_test_wasm(&env);
    client.upgrade_version(&5u32, &hash);

    let result = client.try_upgrade_version(&3u32, &hash);
    assert!(result.is_err());
}

#[test]
fn test_update_wasm_requires_owner() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    // Only the owner may swap the executable. Without mock_all_auths the
    // default test caller is not the owner, so the swap must be rejected.
    let result = client.try_update_wasm(&soroban_sdk::BytesN::from_array(&env, &[9u8; 32]));
    assert!(
        result.is_err(),
        "non-owner must not be able to swap the WASM"
    );
}

#[test]
fn test_kill_switch() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);
    env.mock_all_auths();

    assert!(!client.is_killed());

    client.kill();

    assert!(client.is_killed());
    assert!(client.is_paused());

    // Pulse should fail after kill
    let result = client.try_pulse(&symbol_short!("alice"));
    assert!(result.is_err());
}

#[test]
fn test_set_signers() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);
    env.mock_all_auths();

    let signers = Vec::from_array(&env, [owner.clone()]);
    client.set_signers(&signers, &1u32);

    let (stored_signers, threshold) = client.get_signers();
    assert_eq!(threshold, 1u32);
    assert_eq!(stored_signers.len(), 1);
}

#[test]
fn test_rate_limited_pulse_with_cooldown() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    // First pulse should succeed
    let result = client.rate_limited_pulse(&symbol_short!("alice"), &60u64);
    assert_eq!(result, 1u32);

    // Second pulse within cooldown should fail
    let result = client.try_rate_limited_pulse(&symbol_short!("alice"), &60u64);
    assert!(result.is_err());
}

#[test]
fn test_time_locked_pulse_rejects_before_deadline() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    // Set the ledger to a concrete time so the deadline is deterministic.
    env.ledger().set_timestamp(1_000_000);

    let result = client.try_time_locked_pulse(&symbol_short!("alice"), &1_500_000u64);
    // try_* returns Result<T, Result<PulseError, InvokeError>>; a typed
    // contract error surfaces as Ok(PulseError::...) inside the outer Err.
    assert_eq!(result.unwrap_err(), Ok(PulseError::TimeLockNotReady));

    // After the deadline the pulse fires normally.
    env.ledger().set_timestamp(2_000_000);
    let count = client.time_locked_pulse(&symbol_short!("alice"), &1_500_000u64);
    assert_eq!(count, 1u32);
}

#[test]
fn test_rate_limited_pulse_reports_cooldown_error() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    env.ledger().set_timestamp(1_000_000);
    let result = client.rate_limited_pulse(&symbol_short!("alice"), &60u64);
    assert_eq!(result, 1u32);

    // Second pulse within the cooldown must surface the dedicated error.
    let result = client.try_rate_limited_pulse(&symbol_short!("alice"), &60u64);
    assert_eq!(result.unwrap_err(), Ok(PulseError::CooldownActive));
}

#[test]
fn test_estimate_pulse_cost() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    let cost = client.estimate_pulse_cost();
    assert!(cost > 0);
}

#[test]
fn test_ledger_timestamp() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (_id, client) = deploy_initialized(&env, &owner);

    let ts = client.get_ledger_timestamp();
    // In test environment, timestamp may be 0 initially
    // Just verify the function returns without error
    let _ = ts;
}
