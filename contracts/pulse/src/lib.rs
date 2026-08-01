#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Env, Symbol, log, Address, Val, Vec, IntoVal};

/// Counter for tracking pulse events
#[contracttype]
#[derive(Clone)]
pub struct PulseData {
    pub count: u32,
    pub last_caller: Option<Symbol>,
}

/// Key for storing pulse data in contract storage
const PULSE_KEY: Symbol = symbol_short!("PULSE");

/// Constants for cross-contract communication
const PULSE_RECEIVER_TOPIC: Symbol = symbol_short!("receiver");

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

    /// ──────────────────────────────────────────────
    /// Inter-contract communication: Broadcast pulse to another contract
    /// ──────────────────────────────────────────────
    ///
    /// Calls another contract's `on_pulse_received` function, passing the
    /// pulse count and caller symbol. This demonstrates cross-contract
    /// invocation patterns essential for Soroban composability.
    ///
    /// @param target_contract - Address of the receiver contract
    /// @param caller - Name of the caller for tracking
    /// @returns (own_pulse_count, receiver_result) tuple
    pub fn broadcast_pulse(env: Env, target_contract: Address, caller: Symbol) -> (u32, Val) {
        // First, fire our own pulse
        let own_count = Self::pulse(env.clone(), caller.clone());

        // Then, invoke the target contract via inter-contract call
        // This demonstrates cross-contract communication
        let receiver_result: Val = env.invoke_contract(
            &target_contract,
            &Symbol::new(&env, "on_pulse_received"),
            Vec::from_array(
                &env,
                [own_count.into_val(&env), caller.into_val(&env)],
            ),
        );

        // Emit a cross-contract event for monitoring (clone since target_contract is used in log below)
        env.events().publish(
            (PULSE_RECEIVER_TOPIC, Symbol::new(&env, "broadcast")),
            (own_count, target_contract.clone()),
        );

        log!(
            &env,
            "Pulse #{} broadcasted to contract {}",
            own_count,
            target_contract
        );

        (own_count, receiver_result)
    }

    /// Receive a pulse from another PulseContract instance.
    /// This is the receiver endpoint for inter-contract communication.
    /// Stores the last received pulse data and emits an acknowledgment event.
    pub fn on_pulse_received(env: Env, pulse_count: u32, origin_caller: Symbol) -> Symbol {
        log!(
            &env,
            "Received pulse #{} from {}",
            pulse_count,
            origin_caller
        );

        // Store the last received pulse
        env.storage().instance().set(
            &symbol_short!("RX_PULSE"),
            &(pulse_count, origin_caller.clone()),
        );

        // Emit acknowledgment event
        env.events().publish(
            (symbol_short!("receiver"), symbol_short!("ack")),
            (pulse_count, origin_caller.clone()),
        );

        symbol_short!("ACK")
    }

    /// Get the last received pulse data from cross-contract communication
    pub fn get_last_received(env: Env) -> Option<(u32, Symbol)> {
        env.storage()
            .instance()
            .get::<Symbol, (u32, Symbol)>(&symbol_short!("RX_PULSE"))
    }
}

#[cfg(test)]
mod test;
