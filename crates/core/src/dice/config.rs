use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiceConfig {
    pub expression: String,
    pub seed: Option<u64>,
}
