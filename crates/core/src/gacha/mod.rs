pub mod config;
pub mod data;
pub use config::{GachaConfig, GachaMode, GachaTier, PresetGame};

use rand::{rngs::StdRng, Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullOutcome {
    pub pull_number: usize,
    pub tier: String,
    pub pity_count: usize,
    pub soft_pity_active: bool,
    pub hard_pity_triggered: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TierCount {
    pub tier: String,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullSummary {
    pub total_pulls: usize,
    pub by_tier: Vec<TierCount>,
    pub average_pity: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GachaResult {
    pub pulls: Vec<PullOutcome>,
    pub summary: PullSummary,
    pub seed: u64,
}

pub fn generate_gacha(cfg: &GachaConfig) -> Result<GachaResult, String> {
    if cfg.pull_count == 0 || cfg.pull_count > 1000 {
        return Err("pull_count must be 1–1000".into());
    }
    let seed = cfg.seed.unwrap_or_else(|| StdRng::from_entropy().gen::<u64>());
    let mut rng = ChaCha8Rng::seed_from_u64(seed);

    let pulls = match &cfg.mode {
        GachaMode::Preset { preset } => simulate_preset(&mut rng, cfg.pull_count, preset),
        GachaMode::Custom { tiers } => {
            validate_tiers(tiers)?;
            simulate_custom(&mut rng, cfg.pull_count, tiers)
        }
    };

    let summary = summarize(&pulls);
    Ok(GachaResult { pulls, summary, seed })
}

fn validate_tiers(tiers: &[GachaTier]) -> Result<(), String> {
    let total: f64 = tiers.iter().map(|t| t.rate).sum();
    if total > 100.0 + f64::EPSILON {
        return Err(format!("tier rates sum to {total:.1}%, must be ≤ 100%"));
    }
    Ok(())
}

fn simulate_preset<R: Rng>(rng: &mut R, count: usize, preset: &PresetGame) -> Vec<PullOutcome> {
    let params = data::params_for(preset);
    let mut pity = 0usize;

    (1..=count).map(|n| {
        pity += 1;
        let hard = pity >= params.hard_pity;
        let soft = !hard && pity >= params.soft_pity_start;
        let rate = if hard {
            1.0
        } else if soft {
            let extra = (pity - params.soft_pity_start + 1) as f64;
            (params.base_rate + extra * 0.06).min(1.0)
        } else {
            params.base_rate
        };

        let pity_count = pity;
        let hit_5star = hard || rng.gen_bool(rate);
        let tier = if hit_5star {
            pity = 0;
            "5★".to_string()
        } else if rng.gen_bool(0.051) {
            "4★".to_string()
        } else {
            "3★".to_string()
        };

        PullOutcome { pull_number: n, tier, pity_count, soft_pity_active: soft, hard_pity_triggered: hard }
    }).collect()
}

fn simulate_custom<R: Rng>(rng: &mut R, count: usize, tiers: &[GachaTier]) -> Vec<PullOutcome> {
    (1..=count).map(|n| {
        let roll: f64 = rng.gen_range(0.0..100.0);
        let mut cumulative = 0.0;
        let tier = tiers.iter().find_map(|t| {
            cumulative += t.rate;
            if roll < cumulative { Some(t.name.clone()) } else { None }
        }).unwrap_or_else(|| tiers.last().map(|t| t.name.clone()).unwrap_or_else(|| "Common".into()));
        PullOutcome { pull_number: n, tier, pity_count: 0, soft_pity_active: false, hard_pity_triggered: false }
    }).collect()
}

fn summarize(pulls: &[PullOutcome]) -> PullSummary {
    let mut counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    for p in pulls { *counts.entry(p.tier.clone()).or_insert(0) += 1; }
    let mut by_tier: Vec<TierCount> = counts.into_iter().map(|(tier, count)| TierCount { tier, count }).collect();
    by_tier.sort_by(|a, b| b.count.cmp(&a.count));

    let five_star_pities: Vec<usize> = pulls.iter().filter(|p| p.tier == "5★").map(|p| p.pity_count).collect();
    let average_pity = if five_star_pities.is_empty() { 0.0 }
        else { five_star_pities.iter().sum::<usize>() as f64 / five_star_pities.len() as f64 };

    PullSummary { total_pulls: pulls.len(), by_tier, average_pity }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn genshin(pull_count: usize, seed: u64) -> GachaConfig {
        GachaConfig { mode: GachaMode::Preset { preset: PresetGame::GenshinImpact }, pull_count, seed: Some(seed) }
    }

    #[test]
    fn deterministic_with_seed() {
        let a = generate_gacha(&genshin(10, 42)).unwrap();
        let b = generate_gacha(&genshin(10, 42)).unwrap();
        for (pa, pb) in a.pulls.iter().zip(b.pulls.iter()) {
            assert_eq!(pa.tier, pb.tier);
        }
    }

    #[test]
    fn hard_pity_triggers_by_pull_90() {
        let result = generate_gacha(&genshin(90, 99)).unwrap();
        let has_five_star = result.pulls.iter().any(|p| p.tier == "5★");
        assert!(has_five_star, "hard pity must trigger 5★ by pull 90");
    }

    #[test]
    fn pull_count_100_returns_100_outcomes() {
        let result = generate_gacha(&genshin(100, 1)).unwrap();
        assert_eq!(result.pulls.len(), 100);
        assert_eq!(result.summary.total_pulls, 100);
    }

    #[test]
    fn custom_rates_over_100_returns_error() {
        let cfg = GachaConfig {
            mode: GachaMode::Custom { tiers: vec![
                GachaTier { name: "A".into(), rate: 60.0, color: "#fff".into() },
                GachaTier { name: "B".into(), rate: 60.0, color: "#aaa".into() },
            ]},
            pull_count: 10,
            seed: Some(1),
        };
        assert!(generate_gacha(&cfg).is_err());
    }

    #[test]
    fn custom_rates_valid() {
        let cfg = GachaConfig {
            mode: GachaMode::Custom { tiers: vec![
                GachaTier { name: "Rare".into(), rate: 5.0, color: "#gold".into() },
                GachaTier { name: "Common".into(), rate: 95.0, color: "#gray".into() },
            ]},
            pull_count: 20,
            seed: Some(7),
        };
        let result = generate_gacha(&cfg).unwrap();
        assert_eq!(result.pulls.len(), 20);
    }
}
