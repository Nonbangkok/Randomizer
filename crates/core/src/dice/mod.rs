pub mod config;
pub use config::DiceConfig;

use rand::{rngs::StdRng, Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollGroup {
    pub die_size: u32,
    pub rolls: Vec<u32>,
    pub kept: Vec<bool>,
    pub subtotal: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiceResult {
    pub groups: Vec<RollGroup>,
    pub modifier: i64,
    pub total: i64,
    pub expression: String,
    pub seed: u64,
}

struct ParsedExpr {
    count: u32,
    die_size: u32,
    keep_highest: Option<u32>,
    keep_lowest: Option<u32>,
    modifier: i64,
}

pub fn roll_dice(cfg: &DiceConfig) -> Result<DiceResult, String> {
    let parsed = parse_expression(&cfg.expression)?;
    let seed = cfg.seed.unwrap_or_else(|| StdRng::from_entropy().gen::<u64>());
    let mut rng = ChaCha8Rng::seed_from_u64(seed);
    Ok(roll_with_rng(&mut rng, &parsed, &cfg.expression, seed))
}

fn roll_with_rng<R: Rng>(rng: &mut R, expr: &ParsedExpr, raw_expr: &str, seed: u64) -> DiceResult {
    let rolls: Vec<u32> = (0..expr.count).map(|_| rng.gen_range(1..=expr.die_size)).collect();

    let kept: Vec<bool> = if let Some(k) = expr.keep_highest {
        let k = k as usize;
        let mut indexed: Vec<(usize, u32)> = rolls.iter().copied().enumerate().collect();
        indexed.sort_by(|a, b| b.1.cmp(&a.1));
        let keep_set: std::collections::HashSet<usize> = indexed.iter().take(k).map(|(i, _)| *i).collect();
        (0..rolls.len()).map(|i| keep_set.contains(&i)).collect()
    } else if let Some(k) = expr.keep_lowest {
        let k = k as usize;
        let mut indexed: Vec<(usize, u32)> = rolls.iter().copied().enumerate().collect();
        indexed.sort_by(|a, b| a.1.cmp(&b.1));
        let keep_set: std::collections::HashSet<usize> = indexed.iter().take(k).map(|(i, _)| *i).collect();
        (0..rolls.len()).map(|i| keep_set.contains(&i)).collect()
    } else {
        vec![true; rolls.len()]
    };

    let subtotal: i64 = rolls.iter().zip(kept.iter()).filter(|(_, &k)| k).map(|(v, _)| *v as i64).sum();
    let total = subtotal + expr.modifier;

    DiceResult {
        groups: vec![RollGroup { die_size: expr.die_size, rolls, kept, subtotal }],
        modifier: expr.modifier,
        total,
        expression: raw_expr.to_string(),
        seed,
    }
}

fn parse_expression(expr: &str) -> Result<ParsedExpr, String> {
    let s = expr.trim().to_lowercase();
    if s.is_empty() {
        return Err("empty expression".into());
    }

    let d_pos = s.find('d').ok_or_else(|| format!("missing 'd' in: {expr}"))?;

    let count: u32 = if d_pos == 0 {
        1
    } else {
        s[..d_pos].parse::<u32>().map_err(|_| format!("invalid count in: {expr}"))?
    };

    let after_d = &s[d_pos + 1..];

    let (num_part, keep_highest, keep_lowest) = if let Some(pos) = after_d.find("kh") {
        let k = after_d[pos + 2..].parse::<u32>().map_err(|_| format!("invalid kh value in: {expr}"))?;
        (&after_d[..pos], Some(k), None)
    } else if let Some(pos) = after_d.find("kl") {
        let k = after_d[pos + 2..].parse::<u32>().map_err(|_| format!("invalid kl value in: {expr}"))?;
        (&after_d[..pos], None, Some(k))
    } else {
        (after_d, None, None)
    };

    let (die_str, modifier) = if let Some(pos) = num_part.find('+') {
        let m = num_part[pos + 1..].parse::<i64>().map_err(|_| format!("invalid modifier in: {expr}"))?;
        (&num_part[..pos], m)
    } else if let Some(pos) = num_part.rfind('-') {
        let m = num_part[pos + 1..].parse::<i64>().map_err(|_| format!("invalid modifier in: {expr}"))?;
        (&num_part[..pos], -m)
    } else {
        (num_part, 0i64)
    };

    let die_size = die_str.parse::<u32>().map_err(|_| format!("invalid die size in: {expr}"))?;

    if die_size < 2 { return Err("die size must be >= 2".into()); }
    if count == 0 { return Err("count must be >= 1".into()); }
    if let Some(k) = keep_highest {
        if k == 0 || k > count { return Err(format!("keep {k} out of range for {count} dice")); }
    }
    if let Some(k) = keep_lowest {
        if k == 0 || k > count { return Err(format!("keep {k} out of range for {count} dice")); }
    }

    Ok(ParsedExpr { count, die_size, keep_highest, keep_lowest, modifier })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deterministic_with_seed() {
        let cfg = DiceConfig { expression: "2d6+3".into(), seed: Some(42) };
        let a = roll_dice(&cfg).unwrap();
        let b = roll_dice(&cfg).unwrap();
        assert_eq!(a.total, b.total);
        assert_eq!(a.seed, 42);
    }

    #[test]
    fn d20_in_range() {
        for seed in 0..50u64 {
            let cfg = DiceConfig { expression: "d20".into(), seed: Some(seed) };
            let r = roll_dice(&cfg).unwrap();
            assert!(r.total >= 1 && r.total <= 20, "total {} out of [1,20]", r.total);
        }
    }

    #[test]
    fn two_d6_plus3_in_range() {
        for seed in 0..50u64 {
            let cfg = DiceConfig { expression: "2d6+3".into(), seed: Some(seed) };
            let r = roll_dice(&cfg).unwrap();
            assert!(r.total >= 5 && r.total <= 15, "total {} out of [5,15]", r.total);
        }
    }

    #[test]
    fn four_d6_keep_highest_3() {
        let cfg = DiceConfig { expression: "4d6kh3".into(), seed: Some(1) };
        let r = roll_dice(&cfg).unwrap();
        let kept_count = r.groups[0].kept.iter().filter(|&&k| k).count();
        assert_eq!(kept_count, 3);
        assert_eq!(r.groups[0].rolls.len(), 4);
    }

    #[test]
    fn invalid_expression_returns_error() {
        assert!(roll_dice(&DiceConfig { expression: "notadice".into(), seed: None }).is_err());
    }

    #[test]
    fn empty_expression_returns_error() {
        assert!(roll_dice(&DiceConfig { expression: "".into(), seed: None }).is_err());
    }

    #[test]
    fn d100_in_range() {
        for seed in 0..20u64 {
            let cfg = DiceConfig { expression: "d100".into(), seed: Some(seed) };
            let r = roll_dice(&cfg).unwrap();
            assert!(r.total >= 1 && r.total <= 100);
        }
    }

    #[test]
    fn keep_lowest_2_of_4d6() {
        let cfg = DiceConfig { expression: "4d6kl2".into(), seed: Some(5) };
        let r = roll_dice(&cfg).unwrap();
        let kept: Vec<u32> = r.groups[0].rolls.iter().zip(r.groups[0].kept.iter()).filter(|(_, &k)| k).map(|(v, _)| *v).collect();
        assert_eq!(kept.len(), 2);
    }
}
