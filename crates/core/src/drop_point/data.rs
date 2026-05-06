use super::config::DropGame;

pub fn locations_for(game: DropGame) -> &'static [&'static str] {
    match game {
        DropGame::ApexLegends => &[
            "Storm Point", "World's Edge", "Olympus", "Broken Moon", "Kings Canyon",
            "Skulltown", "Lava Fissure", "The Tree", "Command Center", "Gale Station",
            "Forbidden Zone", "Hammond Labs", "Barometer", "Overlook", "Cascade Falls",
        ],
        DropGame::Fortnite => &[
            "Tilted Towers", "Salty Springs", "Dusty Divot", "Pleasant Park", "Retail Row",
            "Lonely Lodge", "Greasy Grove", "Snobby Shores", "Loot Lake", "Fatal Fields",
            "Flush Factory", "Haunted Hills", "Wailing Woods", "Moisty Mire", "Paradise Palms",
        ],
        DropGame::Warzone => &[
            "Urzikstan City", "Zaravan", "Hadiqa Farms", "Al-Bagra Fortress", "Hafid Port",
            "Levin Resort", "Sa'id City", "Mawizeh Marshlands", "Seaport District", "Taraq Village",
            "Zaravan Suburbs", "Building 21", "Petrov Oil Rig", "Rohan Oil", "Orlov Military Base",
        ],
        DropGame::Universal => &[
            "Hot Zone", "Safe Zone", "High Ground", "River Crossing", "Abandoned Factory",
            "Dense Forest", "Hilltop Overlook", "Old Town Center", "Harbor District", "Eastern Outpost",
            "Northern Bridge", "Supply Depot", "Radio Tower", "Canyon Pass", "Lakeside Camp",
        ],
    }
}
