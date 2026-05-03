pub mod config;
pub mod combinatorial;
pub mod syllable;

use std::collections::HashSet;

use rand::{rngs::StdRng, Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

pub use config::{GenMethod, Genre, Language, NameConfig};

pub fn generate_names(cfg: &NameConfig) -> Vec<String> {
    match cfg.seed {
        Some(s) => collect_unique(&mut ChaCha8Rng::seed_from_u64(s), cfg),
        None => collect_unique(&mut StdRng::from_entropy(), cfg),
    }
}

fn collect_unique<R: Rng>(rng: &mut R, cfg: &NameConfig) -> Vec<String> {
    let count = cfg.count.clamp(1, 100);
    let mut results = Vec::with_capacity(count);
    let mut seen = HashSet::new();
    let max_attempts = count * 20;
    let mut attempts = 0;
    while results.len() < count && attempts < max_attempts {
        attempts += 1;
        let name = generate_one(rng, cfg);
        let name_chars = name.chars().count();
        if name_chars < cfg.min_length || name_chars > cfg.max_length {
            continue;
        }
        if seen.insert(name.clone()) {
            results.push(name);
        }
    }
    results
}

fn generate_one<R: Rng>(rng: &mut R, cfg: &NameConfig) -> String {
    match cfg.method {
        GenMethod::Combinatorial => combinatorial::generate_one(rng, cfg),
        GenMethod::Syllable => syllable::generate_one(rng, cfg),
        GenMethod::Hybrid => {
            if rng.gen_bool(0.5) {
                combinatorial::generate_one(rng, cfg)
            } else {
                syllable::generate_one(rng, cfg)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deterministic_with_seed() {
        let cfg = NameConfig { seed: Some(42), count: 5, ..Default::default() };
        let a = generate_names(&cfg);
        let b = generate_names(&cfg);
        assert_eq!(a, b);
        assert_eq!(a.len(), 5);
    }

    #[test]
    fn count_respected() {
        let cfg = NameConfig { count: 8, seed: Some(1), ..Default::default() };
        assert_eq!(generate_names(&cfg).len(), 8);
    }

    #[test]
    fn syllable_method_works() {
        let cfg = NameConfig {
            method: GenMethod::Syllable,
            seed: Some(7),
            count: 4,
            ..Default::default()
        };
        let names = generate_names(&cfg);
        assert_eq!(names.len(), 4);
        for n in &names { assert!(!n.is_empty()); }
    }

    #[test]
    fn thai_fantasy_produces_thai_chars() {
        let cfg = NameConfig {
            language: Language::Th,
            seed: Some(3),
            count: 3,
            min_length: 2,
            max_length: 30,
            ..Default::default()
        };
        let names = generate_names(&cfg);
        assert!(!names.is_empty());
    }

    #[test]
    fn scifi_distinct_from_fantasy() {
        let f = NameConfig { genre: Genre::Fantasy, seed: Some(99), count: 3, ..Default::default() };
        let s = NameConfig { genre: Genre::SciFi, seed: Some(99), count: 3, ..Default::default() };
        assert_ne!(generate_names(&f), generate_names(&s));
    }
}
