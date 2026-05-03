use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum Game {
    Pokemon,
    EldenRing,
    Universal,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Difficulty {
    Easy,
    Medium,
    Hardcore,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChallengeConfig {
    pub game: Game,
    pub difficulty: Difficulty,
    #[serde(default = "default_count")]
    pub count: usize,
    pub seed: Option<u64>,
}

fn default_count() -> usize { 5 }

impl Default for ChallengeConfig {
    fn default() -> Self {
        Self { game: Game::Universal, difficulty: Difficulty::Medium, count: 5, seed: None }
    }
}
