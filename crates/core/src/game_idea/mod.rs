pub mod config;
pub mod data;
pub use config::{GameIdeaConfig, LockedDimensions};

use rand::{rngs::StdRng, Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameIdea {
    pub genre: String,
    pub setting: String,
    pub mechanic: String,
    pub twist: String,
    pub seed: u64,
}

pub fn generate_game_idea(cfg: &GameIdeaConfig) -> GameIdea {
    let seed = cfg.seed.unwrap_or_else(|| StdRng::from_entropy().gen::<u64>());
    let mut rng = ChaCha8Rng::seed_from_u64(seed);
    let locked = cfg.locked.as_ref();

    let pick = |rng: &mut ChaCha8Rng, pool: &[&str]| -> String {
        pool[rng.gen_range(0..pool.len())].to_string()
    };

    let genre   = locked.and_then(|l| l.genre.clone())   .unwrap_or_else(|| pick(&mut rng, data::GENRES));
    let setting = locked.and_then(|l| l.setting.clone()) .unwrap_or_else(|| pick(&mut rng, data::SETTINGS));
    let mechanic= locked.and_then(|l| l.mechanic.clone()).unwrap_or_else(|| pick(&mut rng, data::MECHANICS));
    let twist   = locked.and_then(|l| l.twist.clone())   .unwrap_or_else(|| pick(&mut rng, data::TWISTS));

    GameIdea { genre, setting, mechanic, twist, seed }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deterministic_with_seed() {
        let cfg = GameIdeaConfig { seed: Some(42), locked: None };
        let a = generate_game_idea(&cfg);
        let b = generate_game_idea(&cfg);
        assert_eq!(a.genre, b.genre);
        assert_eq!(a.setting, b.setting);
        assert_eq!(a.mechanic, b.mechanic);
        assert_eq!(a.twist, b.twist);
        assert_eq!(a.seed, 42);
    }

    #[test]
    fn all_dimensions_populated() {
        let cfg = GameIdeaConfig { seed: Some(1), locked: None };
        let idea = generate_game_idea(&cfg);
        assert!(!idea.genre.is_empty());
        assert!(!idea.setting.is_empty());
        assert!(!idea.mechanic.is_empty());
        assert!(!idea.twist.is_empty());
    }

    #[test]
    fn locked_genre_preserved() {
        let cfg = GameIdeaConfig {
            seed: Some(99),
            locked: Some(LockedDimensions { genre: Some("Horror".into()), ..Default::default() }),
        };
        assert_eq!(generate_game_idea(&cfg).genre, "Horror");
    }

    #[test]
    fn locked_all_dimensions_preserved() {
        let cfg = GameIdeaConfig {
            seed: Some(0),
            locked: Some(LockedDimensions {
                genre: Some("RPG".into()),
                setting: Some("Space".into()),
                mechanic: Some("Crafting".into()),
                twist: Some("The game lies to you".into()),
            }),
        };
        let idea = generate_game_idea(&cfg);
        assert_eq!(idea.genre, "RPG");
        assert_eq!(idea.setting, "Space");
        assert_eq!(idea.mechanic, "Crafting");
        assert_eq!(idea.twist, "The game lies to you");
    }

    #[test]
    fn different_seeds_produce_different_results() {
        let a = generate_game_idea(&GameIdeaConfig { seed: Some(1), locked: None });
        let b = generate_game_idea(&GameIdeaConfig { seed: Some(9999), locked: None });
        assert!(a.genre != b.genre || a.setting != b.setting || a.mechanic != b.mechanic || a.twist != b.twist);
    }
}
