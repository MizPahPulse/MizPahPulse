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

#[test]
fn test_inter_contract_communication() {
    let env = Env::default();

    // Deploy two contract instances to simulate cross-contract communication
    let contract_a_id = env.register_contract(None, PulseContract);
    let contract_b_id = env.register_contract(None, PulseContract);

    let client_a = PulseContractClient::new(&env, &contract_a_id);
    let client_b = PulseContractClient::new(&env, &contract_b_id);

    // Contract A broadcasts a pulse to Contract B
    let target_addr = Address::from_contract_id(&env, &contract_b_id);
    let (count, _result) = client_a.broadcast_pulse(&target_addr, &symbol_short!("alice"));

    assert_eq!(count, 1, "Contract A should have count 1 after broadcast");

    // Contract B should have received the pulse via inter-contract call
    let received = client_b.get_last_received();
    assert!(received.is_some(), "Contract B should have received a pulse");
    let (rx_count, rx_caller) = received.unwrap();
    assert_eq!(rx_count, 1);
    assert_eq!(rx_caller, symbol_short!("alice"));
}

#[test]
fn test_on_pulse_received_direct() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PulseContract);
    let client = PulseContractClient::new(&env, &contract_id);

    // Direct call to on_pulse_received
    let response = client.on_pulse_received(&5u32, &symbol_short!("bob"));
    assert_eq!(response, symbol_short!("ACK"));

    // Verify stored received data
    let received = client.get_last_received();
    assert!(received.is_some());
    let (count, caller) = received.unwrap();
    assert_eq!(count, 5);
    assert_eq!(caller, symbol_short!("bob"));
}

#[test]
fn test_get_last_received_initial() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PulseContract);
    let client = PulseContractClient::new(&env, &contract_id);

    // Should return None when nothing was received
    let received = client.get_last_received();
    assert!(received.is_none());
}
