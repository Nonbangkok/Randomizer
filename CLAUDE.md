# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands are run from the repo root unless noted.

- `npm run build:wasm` — Build the WASM module into `web/pkg/`. **Required before `dev` or `build` if `web/pkg/` is missing or Rust changed**, since the frontend imports from `web/pkg/wasm_bridge.js`.
- `npm run dev` — Start the Vite dev server (proxies to `npm --prefix web run dev`, port 5173).
- `npm run build` — Builds WASM, then the frontend (Vite multi-page build into `web/dist/`).
- `cargo test --workspace` / `npm test` — Run all Rust tests.
- `npm run test:web` — Run frontend unit tests (Vitest, jsdom).
- `npm run test:all` — Rust tests then frontend tests.
- `npm run e2e` — Run Playwright end-to-end tests (Chromium). Spins up `npm run dev` automatically; requires `web/pkg/` to exist.
- `npm --prefix web run typecheck` — `tsc --noEmit` against the strict tsconfig.
- Single Rust test: `cargo test -p core <test_name>` (e.g. `cargo test -p core deterministic_with_seed`).

Toolchain prerequisites: Rust stable with the `wasm32-unknown-unknown` target, Node 18+, and `wasm-pack`.

## Architecture

The project is a **Rust → WASM → TypeScript** stack with a strict layering:

### Rust workspace (`crates/`)

- **`core`** (rlib) — All randomization/generation logic. Pure Rust, no `wasm-bindgen`. Subdivided into `name_gen`, `security` (password gen + entropy + strength analysis), `challenge`, and `data` (static word lists, syllables, descriptors). Every generator accepts an optional `seed: Option<u64>`; when present it uses `ChaCha8Rng` for reproducibility, otherwise `StdRng::from_entropy()`. Tests live alongside each module.
- **`wasm_bridge`** (cdylib) — Thin adapter only. Each exported function takes a `config_json` string, deserializes via `serde_json` into a `core::*::Config`, calls into `core`, and re-serializes the result. **Do not put business logic here.** When adding a new generator, implement it in `core` and add a `#[wasm_bindgen]` shim in `wasm_bridge/src/lib.rs`.

Release profile is tuned for size (`opt-level = "z"`, `lto`, `panic = "abort"`, `wasm-opt = false` is set so wasm-pack doesn't run wasm-opt during release builds).

### Frontend (`web/`)

Vite multi-page app, fully TypeScript. Each entry HTML is declared in `vite.config.js` `rollupOptions.input`. To add a new tool, you must register its `index.html` there.

- `web/index.html`, `web/tools/<tool>/index.html` — Page shells with inline critical CSS and a tiny inline theme bootstrap script (sets `data-theme` on `<html>` from localStorage before paint). `<script type="module" src="/src/pages/<name>.ts">` references the page entry directly; Vite rewrites this to a hashed `.js` chunk in production.
- `web/src/pages/*.ts` — Per-page entry. Pattern is: `wireShell()` → `mount<Tool>(root)` (sync, returns a handle with an async `generate`/`regenerate`) → `bootPage(() => tool.generate())` (handles loader/content swap + error fallback) → `registerShortcut('Primary', ...)` for Space/Enter.
- `web/src/tools/<tool>/<tool>.ts` — Tool UI logic. Each tool calls `getWasm()` from `lib/wasm.ts` directly inside its async action; the WASM module is loaded once during `requestIdleCallback` and memoised across all tools and pages. There is **no** `setGenerator` / `setBackends` injection — that DI seam was removed.
- `web/src/lib/` — Shared utilities. Most relevant when adding or modifying tools:
  - `wasm.ts` — `getWasm(): Promise<WasmModule>` singleton.
  - `shell.ts` — `wireShell()` mounts header/footer, wires theme toggle, defers GA init, registers the service worker, and prefetches nav-link destinations on hover via `prefetch.ts`.
  - `boot.ts` — `bootPage(init)` is the page-level error boundary (try/catch + loader hide + retry-able fallback).
  - `shortcuts.ts` — `registerShortcut('Primary' | 'Space' | 'Enter' | 'KeyG' | …, handler)`. Skips when focus is in an editable element. `'Primary'` matches both Space and Enter (the canonical "trigger main action" combo).
  - `dom.ts` — `escapeHtml`, `cssEscape`, `setRadio`/`setSelect`/`setCheckbox`/`setInputValue`, and a declarative `hydrateForm(form, params, rules)` driven by a `HydrateRule[]` schema. Use this for URL→form hydration; per-tool `syncUrl` writers stay inline because the policies vary (descriptor `'1'|null` vs. flag `'1'|'0'` vs. module-state seeds).
  - `share.ts` — `readParams`/`writeParams` for URL state, `copyShareLink`, base64 url-safe `encodeText`/`decodeText`, `randomSeed`, `shareButtonHtml`.
  - `storage.ts` — `pushHistory`/`getHistory`/`toggleFavorite`/`getFavorites`/`subscribe` + `makeId(value)` (FNV-1a, content-derived stable ids).
  - `history-panel.ts` — `mountHistoryPanel(root, opts)` for the Recent/Favorites panel below each tool, and `favoriteButton(tool, entry)` for inline heart buttons on result cards (delegate clicks via `[data-fav-id]`).
  - `toast.ts`, `analytics.ts`, `theme.ts`, `ads.ts`, `loader.ts`, `layout.ts` — focused single-purpose helpers.
- `web/src/design-system/index.css` — Shared design tokens, base, layout, components, dark mode + cross-tool CSS (`history-panel`, `ads`). **Per-tool CSS is split** — each tool entry imports its own `<tool>.css` directly (`web/src/tools/<tool>/<tool>.css`), so home/blog/legal pages don't pull in unused styles.
- `web/blog/` — Static SEO HTML articles, hand-authored, not generated.

Output goes to `web/dist/` and deploys to Cloudflare Pages via `.github/workflows/deploy.yml` (project name `randomizer`, push-to-`master` trigger). Note `ci.yml` runs `cargo test`, Vitest, the production build, and Playwright on every push/PR. Its `deploy` job is gated on `refs/heads/main` (won't fire on this repo's `master` branch) — `deploy.yml` is the live path.

### Tests

- Rust: `cargo test --workspace`.
- Frontend unit: `web/src/**/*.test.ts` via Vitest + jsdom. The `web/test/setup.js` shim is required because Node ≥ 22 ships its own `globalThis.localStorage` that shadows jsdom's; without the shim, `localStorage.clear()` etc. don't work.
- E2E: `e2e/*.spec.js` via Playwright. Tests rely on Playwright's per-test context isolation for clean storage — do **not** add `localStorage.clear()` in `addInitScript`, since it fires on `page.reload()` too and breaks any "favorite persists across reload" assertion.

### Adding a new tool (end-to-end)

1. Add a Rust module under `crates/core/src/<tool>/` with a `Config` struct (`Serialize`/`Deserialize`) and a public generate fn. Add unit tests with seeded RNG for determinism.
2. Add a `#[wasm_bindgen]` shim in `crates/wasm_bridge/src/lib.rs` that takes `config_json: &str` and returns `Result<String, JsValue>`.
3. Run `npm run build:wasm` to regenerate `web/pkg/`.
4. Create `web/tools/<tool>/index.html` (use an existing tool's HTML as template — same loader, header/footer slots, inline critical CSS), `web/src/pages/<tool>.ts`, `web/src/tools/<tool>/<tool>.{ts,css}`. Follow the `getWasm()` / sync `mount*` pattern from existing tools — the page calls `bootPage(() => tool.generate())` and `registerShortcut('Primary', ...)`.
5. Register the new HTML entry in `web/vite.config.js` under `rollupOptions.input` — pages not listed there won't be built.
6. Add a `<a>` to the new tool in `web/src/lib/layout.ts` `NAV_ITEMS` so it appears in the navbar (and gets free hover-prefetch).
7. Add a Playwright smoke entry in `e2e/smoke.spec.js` and a flow spec under `e2e/<tool>.spec.js`.

## Repo conventions

- Privacy-first: all randomization runs client-side in WASM. Don't introduce server-side generation or telemetry beyond the existing GA4 event tracking in `web/src/lib/analytics.ts`.
- The `seed` field on every generator config is the public surface for "shareable / reproducible results" — preserve it when modifying configs.
- TypeScript is strict (`strict + noUncheckedIndexedAccess + noImplicitOverride + exactOptionalPropertyTypes`). Run `npm --prefix web run typecheck` before committing UI changes.
- WASM JSON results are typed at the `JSON.parse(...) as T` boundary inside each tool. There's no runtime validator — the Rust source-of-truth is sufficient.
- `IMPLEMENTATION_PLAN.md`, `TECHNICAL_PLAN.md`, `IDEA.md`, `FUTURE_PLAN.md` are gitignored local planning docs; do not check them in.
