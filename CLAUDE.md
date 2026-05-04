# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands are run from the repo root unless noted.

- `npm run build:wasm` — Build the WASM module into `web/pkg/`. **Required before `dev` or `build` if `web/pkg/` is missing or Rust changed**, since the frontend imports from `web/pkg/wasm_bridge.js`.
- `npm run dev` — Start the Vite dev server (proxies to `npm --prefix web run dev`, port 5173).
- `npm run build` — Builds WASM, then the frontend (Vite multi-page build into `web/dist/`).
- `npm test` / `cargo test --workspace` — Run all Rust tests. There is no JS test suite.
- Single Rust test: `cargo test -p core <test_name>` (e.g. `cargo test -p core deterministic_with_seed`).

Toolchain prerequisites: Rust stable with the `wasm32-unknown-unknown` target, Node 18+, and `wasm-pack`.

## Architecture

The project is a **Rust → WASM → Vanilla JS** stack with a strict layering:

### Rust workspace (`crates/`)

- **`core`** (rlib) — All randomization/generation logic. Pure Rust, no `wasm-bindgen`. Subdivided into `name_gen`, `security` (password gen + entropy + strength analysis), `challenge`, and `data` (static word lists, syllables, descriptors). Every generator accepts an optional `seed: Option<u64>`; when present it uses `ChaCha8Rng` for reproducibility, otherwise `StdRng::from_entropy()`. Tests live alongside each module.
- **`wasm_bridge`** (cdylib) — Thin adapter only. Each exported function takes a `config_json` string, deserializes via `serde_json` into a `core::*::Config`, calls into `core`, and re-serializes the result. **Do not put business logic here.** When adding a new generator, implement it in `core` and add a `#[wasm_bindgen]` shim in `wasm_bridge/src/lib.rs`.

Release profile is tuned for size (`opt-level = "z"`, `lto`, `panic = "abort"`, `wasm-opt = false` is set so wasm-pack doesn't run wasm-opt during release builds).

### Frontend (`web/`)

Vite multi-page app — each entry HTML is declared in `vite.config.js` `rollupOptions.input`. To add a new tool, you must register its `index.html` there.

- `web/index.html`, `web/tools/<tool>/index.html` — Page shells with inline critical CSS and a tiny inline theme bootstrap script (sets `data-theme` on `<html>` from localStorage before paint).
- `web/src/pages/*.js` — Per-page entry. Imports the design system, calls `wireShell()`, then for tool pages calls `loadWasm()` and mounts the tool component.
- `web/src/tools/<tool>/*.js` — Tool UI logic. Tools follow a **dependency-injection pattern**: the page calls `setGenerator(wasmFn)` to inject the WASM function, then `mountNameGenerator(root)` (or equivalent) returns a controller object with a `generate()` method. The tool module never imports WASM directly.
- `web/src/lib/shell.js` — `wireShell()` wires footer year, theme toggle, and idle-time GA init. `loadWasm()` returns a memoized promise that lazy-imports `web/pkg/wasm_bridge.js` during `requestIdleCallback` to avoid blocking TBT.
- `web/src/design-system/` — CSS-only design system (tokens, base, layout, components, dark-mode). All tools import `design-system/index.css`.
- `web/blog/` — Static SEO HTML articles, hand-authored, not generated.

Output goes to `web/dist/` and deploys to Cloudflare Pages via `.github/workflows/deploy.yml` (project name `randomizer`, push-to-`master` trigger). Note `ci.yml` has a separate deploy job gated on `refs/heads/main` that won't fire on this repo's `master` branch — `deploy.yml` is the live path.

### Adding a new tool (end-to-end)

1. Add a Rust module under `crates/core/src/<tool>/` with a `Config` struct (`Serialize`/`Deserialize`) and a public generate fn. Add unit tests with seeded RNG for determinism.
2. Add a `#[wasm_bindgen]` shim in `crates/wasm_bridge/src/lib.rs` that takes `config_json: &str` and returns `Result<String, JsValue>`.
3. Run `npm run build:wasm` to regenerate `web/pkg/`.
4. Create `web/tools/<tool>/index.html`, `web/src/pages/<tool>.js`, `web/src/tools/<tool>/<tool>.{js,css}`. Follow the `setGenerator` / `mount*` pattern from existing tools.
5. Register the new HTML entry in `web/vite.config.js` under `rollupOptions.input` — pages not listed there won't be built.

## Repo conventions

- Privacy-first: all randomization runs client-side in WASM. Don't introduce server-side generation or telemetry beyond the existing GA4 event tracking in `web/src/lib/analytics.js`.
- The `seed` field on every generator config is the public surface for "shareable / reproducible results" — preserve it when modifying configs.
- `IMPLEMENTATION_PLAN.md`, `TECHNICAL_PLAN.md`, `IDEA.md` are gitignored local planning docs; do not check them in.
