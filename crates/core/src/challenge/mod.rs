pub mod config;
pub mod data;

use rand::{rngs::StdRng, seq::SliceRandom, Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
use serde::{Deserialize, Serialize};

pub use config::{ChallengeConfig, Difficulty, Game};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChallengeRule {
    pub category: String,
    pub text: String,
}

pub fn generate_challenge(cfg: &ChallengeConfig) -> Vec<ChallengeRule> {
    match cfg.seed {
        Some(s) => pick(&mut ChaCha8Rng::seed_from_u64(s), cfg),
        None => pick(&mut StdRng::from_entropy(), cfg),
    }
}

fn pick<R: Rng>(rng: &mut R, cfg: &ChallengeConfig) -> Vec<ChallengeRule> {
    let pool = data::rules_for(cfg.game);
    let max_diff = match cfg.difficulty {
        Difficulty::Easy => 1,
        Difficulty::Medium => 2,
        Difficulty::Hardcore => 3,
    };
    let mut eligible: Vec<&data::Rule> = pool.iter()
        .filter(|r| r.difficulty <= max_diff)
        .collect();
    eligible.shuffle(rng);

    let count = cfg.count.clamp(1, eligible.len().max(1));
    eligible.into_iter()
        .take(count)
        .map(|r| ChallengeRule { category: r.category.into(), text: r.text.into() })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deterministic_with_seed() {
        let cfg = ChallengeConfig { seed: Some(42), ..Default::default() };
        let a: Vec<_> = generate_challenge(&cfg).into_iter().map(|r| r.text).collect();
        let b: Vec<_> = generate_challenge(&cfg).into_iter().map(|r| r.text).collect();
        assert_eq!(a, b);
    }

    #[test]
    fn easy_excludes_hardcore() {
        let cfg = ChallengeConfig {
            game: Game::EldenRing,
            difficulty: Difficulty::Easy,
            count: 20,
            seed: Some(1),
        };
        let rules = generate_challenge(&cfg);
        let pool = data::rules_for(Game::EldenRing);
        for r in &rules {
            let matched = pool.iter().find(|p| p.text == r.text).expect("rule in pool");
            assert!(matched.difficulty <= 1);
        }
    }

    #[test]
    fn count_respected() {
        let cfg = ChallengeConfig { count: 3, seed: Some(2), ..Default::default() };
        assert_eq!(generate_challenge(&cfg).len(), 3);
    }
}
