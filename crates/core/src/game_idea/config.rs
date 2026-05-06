use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LockedDimensions {
    pub genre: Option<String>,
    pub setting: Option<String>,
    pub mechanic: Option<String>,
    pub twist: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameIdeaConfig {
    pub seed: Option<u64>,
    pub locked: Option<LockedDimensions>,
}
