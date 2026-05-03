use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum Strength {
    VeryWeak,
    Weak,
    Fair,
    Strong,
    VeryStrong,
}

impl Strength {
    pub fn from_bits(bits: f64) -> Self {
        if bits < 28.0 { Self::VeryWeak }
        else if bits < 36.0 { Self::Weak }
        else if bits < 60.0 { Self::Fair }
        else if bits < 128.0 { Self::Strong }
        else { Self::VeryStrong }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::VeryWeak => "Very Weak",
            Self::Weak => "Weak",
            Self::Fair => "Fair",
            Self::Strong => "Strong",
            Self::VeryStrong => "Very Strong",
        }
    }
}
