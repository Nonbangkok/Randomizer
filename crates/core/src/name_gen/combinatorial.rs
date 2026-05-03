use rand::Rng;

use crate::data::{descriptors, fantasy_en, fantasy_th, scifi_en, scifi_th};
use super::config::{Genre, Language, NameConfig};

fn pools(genre: Genre, language: Language) -> (&'static [&'static str], &'static [&'static str]) {
    match (genre, language) {
        (Genre::Fantasy | Genre::Rpg, Language::En) => (fantasy_en::PREFIXES, fantasy_en::SUFFIXES),
        (Genre::Fantasy | Genre::Rpg, Language::Th) => (fantasy_th::PREFIXES, fantasy_th::SUFFIXES),
        (Genre::SciFi, Language::En) => (scifi_en::PREFIXES, scifi_en::SUFFIXES),
        (Genre::SciFi, Language::Th) => (scifi_th::PREFIXES, scifi_th::SUFFIXES),
    }
}

pub fn generate_one<R: Rng>(rng: &mut R, cfg: &NameConfig) -> String {
    let (prefixes, suffixes) = pools(cfg.genre, cfg.language);
    let prefix = prefixes[rng.gen_range(0..prefixes.len())];
    let suffix = suffixes[rng.gen_range(0..suffixes.len())];

    let mut name = match cfg.language {
        Language::En => format!("{prefix}{suffix}"),
        Language::Th => format!("{prefix}{suffix}"),
    };

    if cfg.include_descriptor {
        let pool = match cfg.language {
            Language::En => descriptors::EN,
            Language::Th => descriptors::TH,
        };
        if !pool.is_empty() {
            let d = pool[rng.gen_range(0..pool.len())];
            let sep = if matches!(cfg.language, Language::Th) { " " } else { " " };
            name.push_str(sep);
            name.push_str(d);
        }
    }
    name
}
