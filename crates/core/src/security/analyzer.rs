use serde::{Deserialize, Serialize};

use super::entropy::entropy_bits;
use super::strength::Strength;

const COMMON: &[&str] = &[
    "password", "123456", "12345678", "qwerty", "abc123", "letmein", "monkey",
    "dragon", "111111", "iloveyou", "admin", "welcome", "login", "passw0rd",
    "master", "hello", "freedom", "whatever", "qwerty123", "trustno1",
    "shadow", "superman", "batman", "starwars", "pokemon",
];

const KEYBOARD_RUNS: &[&str] = &[
    "qwerty", "asdfgh", "zxcvbn", "qwertyuiop", "asdfghjkl", "zxcvbnm",
    "1234567890", "0987654321",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Analysis {
    pub entropy: f64,
    pub strength: Strength,
    pub strength_label: String,
    pub time_to_crack: TimeToCrack,
    pub warnings: Vec<String>,
    pub length: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeToCrack {
    pub online_throttled: String,
    pub offline_fast: String,
    pub offline_slow: String,
}

pub fn analyze(password: &str) -> Analysis {
    let bits = entropy_bits(password);
    let lower = password.to_ascii_lowercase();
    let mut warnings: Vec<String> = Vec::new();
    let mut effective_bits = bits;

    if password.is_empty() {
        return Analysis {
            entropy: 0.0,
            strength: Strength::VeryWeak,
            strength_label: Strength::VeryWeak.label().into(),
            time_to_crack: TimeToCrack {
                online_throttled: "instant".into(),
                offline_fast: "instant".into(),
                offline_slow: "instant".into(),
            },
            warnings,
            length: 0,
        };
    }

    if password.chars().count() < 8 {
        warnings.push("Shorter than 8 characters".into());
    }
    if has_repeats(password) {
        warnings.push("Contains repeated characters".into());
        effective_bits *= 0.7;
    }
    if has_sequence(&lower) {
        warnings.push("Contains a sequential pattern (e.g. abc, 123)".into());
        effective_bits *= 0.6;
    }
    if KEYBOARD_RUNS.iter().any(|run| lower.contains(run)) {
        warnings.push("Contains a keyboard run (e.g. qwerty)".into());
        effective_bits *= 0.5;
    }
    if COMMON.iter().any(|c| lower.contains(c)) {
        warnings.push("Contains a commonly used password fragment".into());
        effective_bits = effective_bits.min(20.0);
    }

    let strength = Strength::from_bits(effective_bits);
    Analysis {
        entropy: round2(effective_bits),
        strength,
        strength_label: strength.label().into(),
        time_to_crack: time_to_crack(effective_bits),
        warnings,
        length: password.chars().count(),
    }
}

fn round2(x: f64) -> f64 { (x * 100.0).round() / 100.0 }

fn has_repeats(s: &str) -> bool {
    let chars: Vec<char> = s.chars().collect();
    chars.windows(3).any(|w| w[0] == w[1] && w[1] == w[2])
}

fn has_sequence(s: &str) -> bool {
    let chars: Vec<char> = s.chars().collect();
    chars.windows(3).any(|w| {
        let (a, b, c) = (w[0] as i32, w[1] as i32, w[2] as i32);
        (b - a == 1 && c - b == 1) || (a - b == 1 && b - c == 1)
    })
}

fn time_to_crack(bits: f64) -> TimeToCrack {
    let guesses = 2f64.powf(bits.max(0.0)) / 2.0;
    TimeToCrack {
        online_throttled: humanize(guesses / 100.0),
        offline_fast: humanize(guesses / 1.0e10),
        offline_slow: humanize(guesses / 1.0e4),
    }
}

fn humanize(seconds: f64) -> String {
    if !seconds.is_finite() || seconds > 1e15 { return "centuries".into(); }
    if seconds < 1.0 { return "instant".into(); }
    let minute = 60.0;
    let hour = minute * 60.0;
    let day = hour * 24.0;
    let year = day * 365.25;
    let century = year * 100.0;
    if seconds < minute { return format!("{} sec", seconds.round() as u64); }
    if seconds < hour { return format!("{} min", (seconds / minute).round() as u64); }
    if seconds < day { return format!("{} hr", (seconds / hour).round() as u64); }
    if seconds < year { return format!("{} days", (seconds / day).round() as u64); }
    if seconds < century { return format!("{} years", (seconds / year).round() as u64); }
    let centuries = (seconds / century).round() as u64;
    if centuries > 1000 { "millennia".into() } else { format!("{centuries} centuries") }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_repeats() {
        let a = analyze("aaa12345");
        assert!(a.warnings.iter().any(|w| w.contains("repeated")));
    }

    #[test]
    fn detects_sequence() {
        let a = analyze("abcdefg!");
        assert!(a.warnings.iter().any(|w| w.contains("sequential")));
    }

    #[test]
    fn detects_common() {
        let a = analyze("password!");
        assert!(matches!(a.strength, Strength::VeryWeak | Strength::Weak));
    }

    #[test]
    fn strong_password_rated_strong() {
        let a = analyze("xK9!mPq2vNwT8eRf");
        assert!(matches!(a.strength, Strength::Strong | Strength::VeryStrong));
    }

    #[test]
    fn empty_returns_very_weak() {
        let a = analyze("");
        assert_eq!(a.strength, Strength::VeryWeak);
        assert_eq!(a.length, 0);
    }
}
