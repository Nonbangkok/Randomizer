use rand::Rng;

use crate::data::syllables_en::{CODAS, NUCLEI, ONSETS};
use super::config::NameConfig;

pub fn generate_one<R: Rng>(rng: &mut R, cfg: &NameConfig) -> String {
    let syllable_count = rng.gen_range(2..=3);
    let mut name = String::new();
    for i in 0..syllable_count {
        name.push_str(ONSETS[rng.gen_range(0..ONSETS.len())]);
        name.push_str(NUCLEI[rng.gen_range(0..NUCLEI.len())]);
        if i == syllable_count - 1 {
            name.push_str(CODAS[rng.gen_range(0..CODAS.len())]);
        }
    }
    let smoothed = smooth(&name);
    let capitalized = capitalize_first(&smoothed);

    if capitalized.chars().count() < cfg.min_length || capitalized.chars().count() > cfg.max_length {
        if capitalized.chars().count() > cfg.max_length {
            return capitalized.chars().take(cfg.max_length).collect();
        }
    }
    capitalized
}

fn smooth(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut prev: Option<char> = None;
    let mut prev2: Option<char> = None;
    for c in s.chars() {
        if Some(c) == prev && Some(c) == prev2 {
            continue;
        }
        out.push(c);
        prev2 = prev;
        prev = Some(c);
    }
    out
}

fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        Some(c) => c.to_uppercase().chain(chars).collect(),
        None => String::new(),
    }
}
