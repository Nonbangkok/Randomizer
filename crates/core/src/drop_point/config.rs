use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DropGame {
    ApexLegends,
    Fortnite,
    Warzone,
    Universal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DropPointConfig {
    pub game: DropGame,
    pub player_count: usize,
    pub seed: Option<u64>,
}

impl Default for DropPointConfig {
    fn default() -> Self {
        Self { game: DropGame::Universal, player_count: 1, seed: None }
    }
}
