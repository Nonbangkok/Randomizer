use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Genre {
    Fantasy,
    SciFi,
    Rpg,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    En,
    Th,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum GenMethod {
    Combinatorial,
    Syllable,
    Hybrid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NameConfig {
    pub genre: Genre,
    pub language: Language,
    pub method: GenMethod,
    pub count: usize,
    pub seed: Option<u64>,
    #[serde(default = "default_min")]
    pub min_length: usize,
    #[serde(default = "default_max")]
    pub max_length: usize,
    #[serde(default)]
    pub include_descriptor: bool,
}

fn default_min() -> usize { 4 }
fn default_max() -> usize { 24 }

impl Default for NameConfig {
    fn default() -> Self {
        Self {
            genre: Genre::Fantasy,
            language: Language::En,
            method: GenMethod::Combinatorial,
            count: 8,
            seed: None,
            min_length: default_min(),
            max_length: default_max(),
            include_descriptor: false,
        }
    }
}
