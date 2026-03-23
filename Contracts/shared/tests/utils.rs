use soroban_sdk::{Address, Env};
use soroban_sdk::testutils::Address as _;
pub fn random_address(env: &Env) -> Address {
    Address::generate(env)
}
