#![cfg(test)]
//! On-chain cost benchmark (issue: gas documentation).
//!
//! Measures the host-budget CPU instructions and memory bytes consumed by each
//! public operation, using the same technique as the gas-regression guards in
//! `test.rs`. Run with:
//!
//! ```text
//! cargo test --release -- --nocapture --test-threads=1 benchmark
//! ```
//!
//! Results are the delta over a fresh, initialized contract and represent the
//! cost attributable to the operation itself (serialization + VM execution +
//! storage). They are documented in `contracts/README.md` → Gas Benchmark.

extern crate std;

use std::println;

use super::*;
use soroban_sdk::{
    symbol_short,
    token::{StellarAssetClient, TokenClient},
    Address, Env, Vec,
};

/// Measure the host-budget delta of `f`.
fn measure<T>(env: &Env, f: impl FnOnce() -> T) -> (u64, u64) {
    let cpu_before = env.host().budget_cloned().get_cpu_insns_consumed().unwrap();
    let mem_before = env.host().budget_cloned().get_mem_bytes_consumed().unwrap();
    let _ = f();
    let cpu_after = env.host().budget_cloned().get_cpu_insns_consumed().unwrap();
    let mem_after = env.host().budget_cloned().get_mem_bytes_consumed().unwrap();
    (cpu_after - cpu_before, mem_after - mem_before)
}

fn deploy_initialized<'a>(env: &'a Env, owner: &Address) -> (Address, PulseContractClient<'a>) {
    let contract_id = env.register_contract(None, PulseContract);
    let client = PulseContractClient::new(env, &contract_id);
    client.initialize(owner);
    (contract_id, client)
}

fn make_owner(env: &Env) -> Address {
    env.register_contract(None, PulseContract)
}

#[test]
fn benchmark_all_operations() {
    let env = Env::default();
    let owner = make_owner(&env);
    let (id, client) = deploy_initialized(&env, &owner);
    env.mock_all_auths();

    // Fresh contracts for ops that permanently change state.
    let (id_kill, client_kill) = deploy_initialized(&env, &owner);

    let payer = env.register_contract(None, PulseContract);
    let recipient = env.register_contract(None, PulseContract);
    let sac = env.register_stellar_asset_contract_v2(payer.clone());
    let token_addr = sac.address();
    StellarAssetClient::new(&env, &token_addr).mint(&payer, &1_000_000i128);

    // The SDK 21 test host cannot host a SAC at the production native address
    // (asset contract IDs embed the network ID), so the XLM rails are pointed
    // at the locally registered SAC. The measured cost is identical: the XLM
    // wrappers resolve the configured address and delegate to the token path.
    client.set_native_token_address(&token_addr);

    // Fund the contract itself so `withdraw_token` has a balance to move.
    TokenClient::new(&env, &token_addr).transfer(&payer, &id, &500_000i128);

    let mut rows: std::vec::Vec<(&'static str, u64, u64)> = std::vec::Vec::new();

    // Reads
    let (cpu, mem) = measure(&env, || client.get_pulse_count());
    rows.push(("get_pulse_count", cpu, mem));
    let (cpu, mem) = measure(&env, || client.get_pulse_data());
    rows.push(("get_pulse_data", cpu, mem));
    let (cpu, mem) = measure(&env, || client.get_version());
    rows.push(("get_version", cpu, mem));
    let (cpu, mem) = measure(&env, || client.get_signers());
    rows.push(("get_signers", cpu, mem));
    let (cpu, mem) = measure(&env, || client.get_token_balance(&token_addr, &payer));
    rows.push(("get_token_balance", cpu, mem));
    let (cpu, mem) = measure(&env, || client.estimate_pulse_cost());
    rows.push(("estimate_pulse_cost", cpu, mem));

    // Writes
    let (cpu, mem) = measure(&env, || client.pulse(&symbol_short!("alice")));
    rows.push(("pulse", cpu, mem));

    let callers = Vec::from_array(
        &env,
        [symbol_short!("a"), symbol_short!("b"), symbol_short!("c")],
    );
    let (cpu, mem) = measure(&env, || client.batch_pulse(&callers));
    rows.push(("batch_pulse(3)", cpu, mem));

    let (cpu, mem) = measure(&env, || {
        client.rate_limited_pulse(&symbol_short!("bob"), &0u64)
    });
    rows.push(("rate_limited_pulse", cpu, mem));

    // Payments
    let (cpu, mem) = measure(&env, || {
        client.tip_token(
            &token_addr,
            &payer,
            &recipient,
            &10i128,
            &symbol_short!("carol"),
        )
    });
    rows.push(("tip_token(SEP-41)", cpu, mem));

    let (cpu, mem) = measure(&env, || {
        client.tip_xlm(&payer, &recipient, &10i128, &symbol_short!("dave"))
    });
    rows.push(("tip_xlm(native rail)", cpu, mem));

    // Allowance rail: approve the contract, then pull via transfer_from.
    TokenClient::new(&env, &token_addr).approve(&payer, &id, &1_000_000i128, &6_000_000u32);
    let (cpu, mem) = measure(&env, || {
        client.tip_token_from(
            &token_addr,
            &payer,
            &recipient,
            &10i128,
            &symbol_short!("erin"),
        )
    });
    rows.push(("tip_token_from(allowance)", cpu, mem));

    // Batch rail: distribute to 3 recipients in a single transaction.
    let batch_recipients = Vec::from_array(
        &env,
        [
            (recipient.clone(), 10i128),
            (payer.clone(), 10i128),
            (recipient.clone(), 10i128),
        ],
    );
    let (cpu, mem) = measure(&env, || {
        client.batch_tip_token(
            &token_addr,
            &payer,
            &batch_recipients,
            &symbol_short!("frank"),
        )
    });
    rows.push(("batch_tip_token(3)", cpu, mem));

    let (cpu, mem) = measure(&env, || client.get_token_metadata(&token_addr));
    rows.push(("get_token_metadata", cpu, mem));

    let (cpu, mem) = measure(&env, || {
        client.withdraw_token(&token_addr, &recipient, &10i128)
    });
    rows.push(("withdraw_token", cpu, mem));

    // Admin
    let signers = Vec::from_array(&env, [owner.clone()]);
    let (cpu, mem) = measure(&env, || client.set_signers(&signers, &1u32));
    rows.push(("set_signers", cpu, mem));
    let (cpu, mem) = measure(&env, || client.set_max_pulse_count(&10_000u32));
    rows.push(("set_max_pulse_count", cpu, mem));
    let (cpu, mem) = measure(&env, || client.pause());
    rows.push(("pause", cpu, mem));
    let (cpu, mem) = measure(&env, || client.unpause());
    rows.push(("unpause", cpu, mem));
    let (cpu, mem) = measure(&env, || client.kill());
    rows.push(("kill", cpu, mem));
    let (cpu, mem) = measure(&env, || client.set_address_rate_limit(&payer, &60u64));
    rows.push(("set_address_rate_limit", cpu, mem));

    // Report
    println!("\n┌──────────────────────────────────┬────────────┬────────────┐");
    println!("│ Operation                        │ CPU insns  │ Mem bytes  │");
    println!("├──────────────────────────────────┼────────────┼────────────┤");
    for row in rows.iter() {
        println!("│ {:<32} │ {:>10} │ {:>10} │", row.0, row.1, row.2);
    }
    println!("└──────────────────────────────────┴────────────┴────────────┘\n");

    let _ = id;
    let _ = id_kill;
    let _ = client_kill;
}
