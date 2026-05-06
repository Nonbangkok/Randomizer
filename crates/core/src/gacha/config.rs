use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PresetGame {
    GenshinImpact,
    HonkaiStarRail,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GachaTier {
    pub name: String,
    pub rate: f64,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum GachaMode {
    Preset { preset: PresetGame },
    Custom { tiers: Vec<GachaTier> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GachaConfig {
    pub mode: GachaMode,
    pub pull_count: usize,
    pub seed: Option<u64>,
}
