use super::config::Game;

#[derive(Debug, Clone, Copy)]
pub struct Rule {
    pub category: &'static str,
    pub text: &'static str,
    /// Difficulty weight: 1 = easy, 2 = medium, 3 = hardcore
    pub difficulty: u8,
}

const POKEMON: &[Rule] = &[
    Rule { category: "Encounters", text: "Only the first Pokémon you encounter on each route may be caught.", difficulty: 1 },
    Rule { category: "Encounters", text: "If you fail to catch the first encounter, no other catches on that route.", difficulty: 2 },
    Rule { category: "Death", text: "A Pokémon that faints is considered dead and must be released or boxed permanently.", difficulty: 1 },
    Rule { category: "Death", text: "If your entire party faints, the run is over.", difficulty: 3 },
    Rule { category: "Items", text: "No healing items may be used during battles.", difficulty: 2 },
    Rule { category: "Items", text: "No revives at any time.", difficulty: 3 },
    Rule { category: "Naming", text: "All caught Pokémon must be nicknamed.", difficulty: 1 },
    Rule { category: "Battles", text: "Set battle style only — no switching after a faint.", difficulty: 2 },
    Rule { category: "Battles", text: "No grinding above the next Gym Leader's ace level.", difficulty: 2 },
    Rule { category: "Species", text: "No duplicate species clause: skip encounters of species already caught.", difficulty: 1 },
    Rule { category: "Hardcore", text: "Level cap = highest-level Pokémon of the next major boss.", difficulty: 3 },
    Rule { category: "Hardcore", text: "No held items in battle.", difficulty: 3 },
];

const ELDEN_RING: &[Rule] = &[
    Rule { category: "Build", text: "Stay at level 1 for the entire playthrough (RL1).", difficulty: 3 },
    Rule { category: "Build", text: "Maximum vigor: 20.", difficulty: 2 },
    Rule { category: "Combat", text: "No shields equipped at any time.", difficulty: 2 },
    Rule { category: "Combat", text: "No summons (spirit ashes or co-op).", difficulty: 2 },
    Rule { category: "Combat", text: "No Mimic Tear or Tiche under any circumstance.", difficulty: 1 },
    Rule { category: "Combat", text: "No ranged weapons or spells against bosses.", difficulty: 3 },
    Rule { category: "Items", text: "No crafted consumables in boss fights.", difficulty: 2 },
    Rule { category: "Items", text: "No flask upgrades past +5.", difficulty: 3 },
    Rule { category: "Exploration", text: "No fast travel between sites of grace.", difficulty: 2 },
    Rule { category: "Exploration", text: "Spectral Steed Torrent is forbidden in combat.", difficulty: 1 },
    Rule { category: "Death", text: "On death, lose all runes — no recovery.", difficulty: 2 },
    Rule { category: "Hardcore", text: "Permadeath: a single death ends the run.", difficulty: 3 },
];

const UNIVERSAL: &[Rule] = &[
    Rule { category: "Exploration", text: "No fast travel for the entire playthrough.", difficulty: 2 },
    Rule { category: "Exploration", text: "No HUD map — navigate by landmarks only.", difficulty: 3 },
    Rule { category: "Combat", text: "No pausing during combat.", difficulty: 2 },
    Rule { category: "Combat", text: "Hardest difficulty only.", difficulty: 2 },
    Rule { category: "Items", text: "No buying from in-game shops.", difficulty: 1 },
    Rule { category: "Items", text: "No equipment upgrades unless dropped from a boss.", difficulty: 2 },
    Rule { category: "Death", text: "Three deaths total — run ends on the fourth.", difficulty: 3 },
    Rule { category: "Death", text: "Each death costs all consumables of one category.", difficulty: 2 },
    Rule { category: "Side Content", text: "Main story only — no side quests.", difficulty: 1 },
    Rule { category: "Hardcore", text: "Permadeath: one death ends the run.", difficulty: 3 },
];

pub fn rules_for(game: Game) -> &'static [Rule] {
    match game {
        Game::Pokemon => POKEMON,
        Game::EldenRing => ELDEN_RING,
        Game::Universal => UNIVERSAL,
    }
}
