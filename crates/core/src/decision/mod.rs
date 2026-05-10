use rand::{rngs::StdRng, Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionConfig {
    pub options: Vec<String>,
    pub weights: Option<Vec<f64>>,
    pub seed: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionResult {
    pub choice: String,
    pub index: usize,
    pub seed: u64,
}

pub fn generate_decision(cfg: &DecisionConfig) -> Result<DecisionResult, String> {
    if cfg.options.is_empty() {
        return Err("Options list cannot be empty".to_string());
    }

    let seed = cfg.seed.unwrap_or_else(|| StdRng::from_entropy().gen::<u64>());
    let mut rng = ChaCha8Rng::seed_from_u64(seed);

    let index = if let Some(weights) = &cfg.weights {
        if weights.len() != cfg.options.len() {
            return Err("Weights must have the same length as options".to_string());
        }
        
        let total_weight: f64 = weights.iter().sum();
        if total_weight <= 0.0 {
            return Err("Total weight must be greater than zero".to_string());
        }

        let mut r = rng.gen::<f64>() * total_weight;
        let mut selected = 0;
        for (i, &w) in weights.iter().enumerate() {
            if r < w {
                selected = i;
                break;
            }
            r -= w;
        }
        selected
    } else {
        rng.gen_range(0..cfg.options.len())
    };

    Ok(DecisionResult {
        choice: cfg.options[index].clone(),
        index,
        seed,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_decision() {
        let cfg = DecisionConfig {
            options: vec!["Yes".to_string(), "No".to_string()],
            weights: None,
            seed: Some(42),
        };
        let res = generate_decision(&cfg).unwrap();
        assert!(res.choice == "Yes" || res.choice == "No");
        assert_eq!(res.seed, 42);
    }

    #[test]
    fn test_deterministic_decision() {
        let cfg = DecisionConfig {
            options: vec!["A".into(), "B".into(), "C".into()],
            weights: None,
            seed: Some(123),
        };
        let res1 = generate_decision(&cfg).unwrap();
        let res2 = generate_decision(&cfg).unwrap();
        assert_eq!(res1.choice, res2.choice);
        assert_eq!(res1.index, res2.index);
    }

    #[test]
    fn test_weighted_decision() {
        let cfg = DecisionConfig {
            options: vec!["A".into(), "B".into()],
            weights: Some(vec![100.0, 0.0]),
            seed: None,
        };
        let res = generate_decision(&cfg).unwrap();
        assert_eq!(res.choice, "A");
    }
}
