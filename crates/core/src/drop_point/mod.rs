pub mod config;
pub mod data;
pub use config::{DropGame, DropPointConfig};

use rand::{rngs::StdRng, Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DropPointResult {
    pub locations: Vec<String>,
    pub seed: u64,
}

pub fn generate_drop_point(cfg: &DropPointConfig) -> DropPointResult {
    let count = cfg.player_count.clamp(1, 4);
    let seed = cfg.seed.unwrap_or_else(|| StdRng::from_entropy().gen::<u64>());
    let mut rng = ChaCha8Rng::seed_from_u64(seed);

    let pool = data::locations_for(cfg.game);
    let mut available: Vec<&str> = pool.to_vec();
    let mut locations = Vec::with_capacity(count);

    for _ in 0..count {
        if available.is_empty() { available = pool.to_vec(); }
        let idx = rng.gen_range(0..available.len());
        locations.push(available.remove(idx).to_string());
    }

    DropPointResult { locations, seed }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deterministic_with_seed() {
        let cfg = DropPointConfig { game: DropGame::ApexLegends, player_count: 2, seed: Some(42) };
        let a = generate_drop_point(&cfg);
        let b = generate_drop_point(&cfg);
        assert_eq!(a.locations, b.locations);
        assert_eq!(a.seed, 42);
    }

    #[test]
    fn player_count_3_returns_3_locations() {
        let cfg = DropPointConfig { game: DropGame::Fortnite, player_count: 3, seed: Some(1) };
        assert_eq!(generate_drop_point(&cfg).locations.len(), 3);
    }

    #[test]
    fn locations_from_correct_pool() {
        let cfg = DropPointConfig { game: DropGame::Warzone, player_count: 4, seed: Some(5) };
        let result = generate_drop_point(&cfg);
        let pool = data::locations_for(DropGame::Warzone);
        for loc in &result.locations {
            assert!(pool.contains(&loc.as_str()), "{loc} not in Warzone pool");
        }
    }

    #[test]
    fn no_duplicate_locations() {
        let cfg = DropPointConfig { game: DropGame::Universal, player_count: 4, seed: Some(3) };
        let result = generate_drop_point(&cfg);
        let unique: std::collections::HashSet<&str> = result.locations.iter().map(|s| s.as_str()).collect();
        assert_eq!(unique.len(), result.locations.len());
    }

    #[test]
    fn player_count_clamped_to_4() {
        let cfg = DropPointConfig { game: DropGame::Universal, player_count: 10, seed: Some(1) };
        assert_eq!(generate_drop_point(&cfg).locations.len(), 4);
    }
}
