#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Env, Symbol, log};

/// Counter for tracking pulse events
#[contracttype]
#[derive(Clone)]
pub struct PulseData {
    pub count: u32,
    pub last_caller: Option<Symbol>,
}

/// Key for storing pulse data in contract storage
const PULSE_KEY: Symbol = symbol_short!("PULSE");

#[contract]
pub struct PulseContract;

#[contractimpl]
impl PulseContract {
    /// Pulse — increments the counter and emits an event.
    /// Each call records the caller and increments the count.
    pub fn pulse(env: Env, caller: Symbol) -> u32 {
        // Load existing pulse data or create new
        let mut data = env
            .storage()
            .instance()
            .get::<Symbol, PulseData>(&PULSE_KEY)
            .unwrap_or(PulseData {
                count: 0,
                last_caller: None,
            });

        // Increment and update
        data.count += 1;
        data.last_caller = Some(caller.clone());

        // Store updated data
        env.storage().instance().set(&PULSE_KEY, &data);

        // Emit a pulse event that can be monitored by MizpahPulse
        env.events()
            .publish(
                (symbol_short!("pulse"), symbol_short!("fired")),
                (data.count, caller.clone()),
            );

        log!(&env, "Pulse #{} fired by {}", data.count, caller);

        data.count
    }

    /// Get the current pulse count without modifying state.
    pub fn get_pulse_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get::<Symbol, PulseData>(&PULSE_KEY)
            .map(|d| d.count)
            .unwrap_or(0)
    }

    /// Get the full pulse data (count + last caller).
    pub fn get_pulse_data(env: Env) -> PulseData {
        env.storage()
            .instance()
            .get::<Symbol, PulseData>(&PULSE_KEY)
            .unwrap_or(PulseData {
                count: 0,
                last_caller: None,
            })
    }
}

#[cfg(test)]
mod test;
