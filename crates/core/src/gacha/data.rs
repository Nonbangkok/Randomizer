use super::config::PresetGame;

pub struct PresetParams {
    pub base_rate: f64,
    pub soft_pity_start: usize,
    pub hard_pity: usize,
}

pub fn params_for(preset: &PresetGame) -> PresetParams {
    match preset {
        PresetGame::GenshinImpact | PresetGame::HonkaiStarRail => PresetParams {
            base_rate: 0.006,
            soft_pity_start: 74,
            hard_pity: 90,
        },
    }
}
