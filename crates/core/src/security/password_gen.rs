use rand::{rngs::OsRng, seq::SliceRandom, Rng};
use serde::{Deserialize, Serialize};

const UPPER: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER: &str = "abcdefghijklmnopqrstuvwxyz";
const DIGITS: &str = "0123456789";
const SYMBOLS: &str = "!@#$%^&*()-_=+[]{};:,.<>?/~";
const AMBIGUOUS: &str = "lI1O0o";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasswordConfig {
    pub length: usize,
    #[serde(default = "yes")] pub uppercase: bool,
    #[serde(default = "yes")] pub lowercase: bool,
    #[serde(default = "yes")] pub numbers: bool,
    #[serde(default)] pub symbols: bool,
    #[serde(default)] pub exclude_ambiguous: bool,
    #[serde(default)] pub custom_exclude: String,
}

fn yes() -> bool { true }

impl Default for PasswordConfig {
    fn default() -> Self {
        Self {
            length: 16,
            uppercase: true,
            lowercase: true,
            numbers: true,
            symbols: false,
            exclude_ambiguous: false,
            custom_exclude: String::new(),
        }
    }
}

pub struct GenerationError(pub &'static str);

pub fn pool(cfg: &PasswordConfig) -> Vec<char> {
    let mut groups: Vec<&str> = Vec::new();
    if cfg.uppercase { groups.push(UPPER); }
    if cfg.lowercase { groups.push(LOWER); }
    if cfg.numbers { groups.push(DIGITS); }
    if cfg.symbols { groups.push(SYMBOLS); }

    let mut chars: Vec<char> = groups.iter().flat_map(|s| s.chars()).collect();
    if cfg.exclude_ambiguous {
        chars.retain(|c| !AMBIGUOUS.contains(*c));
    }
    if !cfg.custom_exclude.is_empty() {
        let exclude: Vec<char> = cfg.custom_exclude.chars().collect();
        chars.retain(|c| !exclude.contains(c));
    }
    chars.sort_unstable();
    chars.dedup();
    chars
}

pub fn generate_password(cfg: &PasswordConfig) -> Result<String, &'static str> {
    let length = cfg.length.clamp(4, 256);
    let chars = pool(cfg);
    if chars.is_empty() {
        return Err("character pool is empty");
    }

    let mut rng = OsRng;
    let mut required: Vec<char> = Vec::new();
    let mut required_groups: Vec<&str> = Vec::new();
    if cfg.uppercase { required_groups.push(UPPER); }
    if cfg.lowercase { required_groups.push(LOWER); }
    if cfg.numbers { required_groups.push(DIGITS); }
    if cfg.symbols { required_groups.push(SYMBOLS); }

    for group in &required_groups {
        let allowed: Vec<char> = group.chars().filter(|c| chars.contains(c)).collect();
        if let Some(&c) = allowed.choose(&mut rng) {
            required.push(c);
        }
    }

    let mut out: Vec<char> = Vec::with_capacity(length);
    out.extend(required.iter().take(length));
    while out.len() < length {
        let idx = rng.gen_range(0..chars.len());
        out.push(chars[idx]);
    }
    out.shuffle(&mut rng);
    Ok(out.into_iter().collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn respects_length() {
        let cfg = PasswordConfig { length: 24, ..Default::default() };
        let p = generate_password(&cfg).unwrap();
        assert_eq!(p.chars().count(), 24);
    }

    #[test]
    fn excludes_ambiguous() {
        let cfg = PasswordConfig { length: 64, exclude_ambiguous: true, symbols: true, ..Default::default() };
        let p = generate_password(&cfg).unwrap();
        for c in AMBIGUOUS.chars() {
            assert!(!p.contains(c), "found ambiguous {c}");
        }
    }

    #[test]
    fn empty_pool_errors() {
        let cfg = PasswordConfig {
            length: 16, uppercase: false, lowercase: false, numbers: false, symbols: false,
            ..Default::default()
        };
        assert!(generate_password(&cfg).is_err());
    }

    #[test]
    fn custom_exclude_respected() {
        let cfg = PasswordConfig { length: 32, custom_exclude: "abc".into(), ..Default::default() };
        let p = generate_password(&cfg).unwrap();
        for c in ['a', 'b', 'c'] {
            assert!(!p.contains(c));
        }
    }
}
