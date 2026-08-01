#![cfg(test)]

use super::*;
use soroban_sdk::Env;

#[test]
fn test_pulse_increments_count() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PulseContract);
    let client = PulseContractClient::new(&env, &contract_id);

    // Initial count should be 0
    assert_eq!(client.get_pulse_count(), 0);

    // First pulse
    let count1 = client.pulse(&symbol_short!("alice"));
    assert_eq!(count1, 1);

    // Second pulse
    let count2 = client.pulse(&symbol_short!("bob"));
    assert_eq!(count2, 2);

    // Verify stored state
    let data = client.get_pulse_data();
    assert_eq!(data.count, 2);
    assert_eq!(data.last_caller, Some(symbol_short!("bob")));
}

#[test]
fn test_pulse_emits_event() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PulseContract);
    let client = PulseContractClient::new(&env, &contract_id);

    let _count = client.pulse(&symbol_short!("alice"));

    // Verify event was emitted
    let events = env.events().all();
    assert!(!events.is_empty(), "Should have emitted at least one event");
}

#[test]
fn test_get_pulse_count_initial() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PulseContract);
    let client = PulseContractClient::new(&env, &contract_id);

    assert_eq!(client.get_pulse_count(), 0);
}
