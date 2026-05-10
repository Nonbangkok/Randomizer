pub mod challenge;
pub mod data;
pub mod decision;
pub mod dice;
pub mod drop_point;
pub mod gacha;
pub mod game_idea;
pub mod name_gen;
pub mod security;

pub fn greet(name: &str) -> String {
    format!("Hello, {name}! Randomizer core is online.")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn greet_returns_message() {
        assert_eq!(greet("world"), "Hello, world! Randomizer core is online.");
    }
}
