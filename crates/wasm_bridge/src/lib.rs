use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    core::greet(name)
}

#[wasm_bindgen]
pub fn generate_names(config_json: &str) -> Result<String, JsValue> {
    let cfg: core::name_gen::NameConfig = serde_json::from_str(config_json)
        .map_err(|e| JsValue::from_str(&format!("invalid config: {e}")))?;
    let names = core::name_gen::generate_names(&cfg);
    serde_json::to_string(&names)
        .map_err(|e| JsValue::from_str(&format!("serialize failed: {e}")))
}

#[wasm_bindgen]
pub fn generate_password(config_json: &str) -> Result<String, JsValue> {
    let cfg: core::security::PasswordConfig = serde_json::from_str(config_json)
        .map_err(|e| JsValue::from_str(&format!("invalid config: {e}")))?;
    core::security::generate_password(&cfg).map(String::from)
        .map_err(|e| JsValue::from_str(e))
}

#[wasm_bindgen]
pub fn analyze_password(password: &str) -> Result<String, JsValue> {
    let analysis = core::security::analyze(password);
    serde_json::to_string(&analysis)
        .map_err(|e| JsValue::from_str(&format!("serialize failed: {e}")))
}

#[wasm_bindgen]
pub fn generate_challenge(config_json: &str) -> Result<String, JsValue> {
    let cfg: core::challenge::ChallengeConfig = serde_json::from_str(config_json)
        .map_err(|e| JsValue::from_str(&format!("invalid config: {e}")))?;
    let rules = core::challenge::generate_challenge(&cfg);
    serde_json::to_string(&rules)
        .map_err(|e| JsValue::from_str(&format!("serialize failed: {e}")))
}

#[wasm_bindgen]
pub fn generate_dice(config_json: &str) -> Result<String, JsValue> {
    let cfg: core::dice::DiceConfig = serde_json::from_str(config_json)
        .map_err(|e| JsValue::from_str(&format!("invalid config: {e}")))?;
    let result = core::dice::roll_dice(&cfg)
        .map_err(|e| JsValue::from_str(&e))?;
    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("serialize failed: {e}")))
}

#[wasm_bindgen]
pub fn generate_gacha(config_json: &str) -> Result<String, JsValue> {
    let cfg: core::gacha::GachaConfig = serde_json::from_str(config_json)
        .map_err(|e| JsValue::from_str(&format!("invalid config: {e}")))?;
    let result = core::gacha::generate_gacha(&cfg)
        .map_err(|e| JsValue::from_str(&e))?;
    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("serialize failed: {e}")))
}

#[wasm_bindgen]
pub fn generate_game_idea(config_json: &str) -> Result<String, JsValue> {
    let cfg: core::game_idea::GameIdeaConfig = serde_json::from_str(config_json)
        .map_err(|e| JsValue::from_str(&format!("invalid config: {e}")))?;
    let result = core::game_idea::generate_game_idea(&cfg);
    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("serialize failed: {e}")))
}

#[wasm_bindgen]
pub fn generate_drop_point(config_json: &str) -> Result<String, JsValue> {
    let cfg: core::drop_point::DropPointConfig = serde_json::from_str(config_json)
        .map_err(|e| JsValue::from_str(&format!("invalid config: {e}")))?;
    let result = core::drop_point::generate_drop_point(&cfg);
    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("serialize failed: {e}")))
}
#[wasm_bindgen]
pub fn generate_decision(config_json: &str) -> Result<String, JsValue> {
    let cfg: core::decision::DecisionConfig = serde_json::from_str(config_json)
        .map_err(|e| JsValue::from_str(&format!("invalid config: {e}")))?;
    let result = core::decision::generate_decision(&cfg)
        .map_err(|e| JsValue::from_str(&e))?;
    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("serialize failed: {e}")))
}
