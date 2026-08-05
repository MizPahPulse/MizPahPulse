#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Events;
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
