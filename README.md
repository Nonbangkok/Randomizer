# 🎲 Randomizer: The Digital Utility Empire

<p align="center">
  <img src="assets/logo.svg" alt="Randomizer Logo" width="350" />
</p>

[![Rust](https://img.shields.io/badge/Language-Rust-orange.svg)](https://www.rust-lang.org/)
[![WebAssembly](https://img.shields.io/badge/Runtime-WASM-blueviolet.svg)](https://webassembly.org/)
[![Vite](https://img.shields.io/badge/Frontend-Vite-646CFF.svg)](https://vitejs.dev/)
[![Performance](https://img.shields.io/badge/Lighthouse-100/100/100/100-brightgreen.svg)]()

**Randomizer** is a high-performance digital utility suite designed for speed, security, and a premium user experience. Powered by **Rust** and **WebAssembly (WASM)**, it delivers native-level processing directly in your browser.

---

## 🚀 The Vision
This project is built on the **"High-Performance Micro-Solutions"** philosophy. We focus on solving specific problems with zero-latency tools, optimized for SEO and Core Web Vitals to build a sustainable and scalable utility platform.

## ✨ Current Tools

### 👤 Character Name Generator
A specialized name generator for writers, gamers, and RPG enthusiasts.
- **Engine:** Powered by Rust-based combinatorial and syllable generation algorithms.
- **Features:** Supports English and Thai, with customizable genres (Fantasy, Sci-Fi, RPG).

### 🔒 Secure Password Generator
Ultra-secure password generation and analysis.
- **Security:** 100% client-side processing (your data never leaves your browser).
- **Analysis:** Features a real-time Strength Analyzer and Entropy Calculator.

### 🎡 Game Backlog Wheel
A decision-making tool for gamers with an overwhelming backlog.
- **Usage:** Randomly selects your next game to play from your personal library.

### ⚔️ Challenge Generator
Generates hardcore gameplay rules and challenges (e.g., Nuzlocke rules) for titles like Elden Ring or Pokémon.

### 🎲 Dice Roller
A versatile rolling engine for TTRPGs and board games.
- **Features:** Supports complex expressions (e.g., `4d6kh3`), custom dice, and cryptographic RNG.

### 🎰 Gacha & Loot Box Simulator
Simulate pulls for popular games like Genshin Impact and Honkai: Star Rail.
- **Systems:** Realistic pity systems, soft-pity curves, and custom drop rate editor.

### 💡 Indie Game Idea Generator
Spark your next project with randomized genres, settings, and mechanics.

### 🪂 Battle Royale Drop Point
Randomized landing locations for Apex Legends, Warzone, and more.

---

## 🛠 Tech Stack (The Performance Edge)

- **Core Logic:** [Rust](https://www.rust-lang.org/) — For memory safety and maximum execution speed.
- **Runtime:** [WebAssembly (WASM)](https://webassembly.org/) — Bringing native performance to the web.
- **Frontend:** HTML5 / CSS3 / Vanilla JS (Vite) — Lightweight, mobile-first, and lightning-fast.
- **UI Design:** Dark Mode & Neon Aesthetic — Premium design tailored for our target audience.

---

## 📦 Project Structure

```text
├── assets/            # Shared assets (logo, images)
├── crates/
│   ├── core/          # Core business logic (Rust)
│   └── wasm_bridge/   # WASM bridge between Rust and JavaScript
├── web/               # Frontend Application (Vite/Vanilla JS)
├── package.json       # Root scripts for build and development
└── Cargo.toml         # Rust workspace configuration
```

---

## 🚀 Getting Started

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Node.js](https://nodejs.org/) (v18+)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/randomizer.git
   cd randomizer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the WASM module:**
   ```bash
   npm run build:wasm
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

---

## 🗺 Roadmap
- [x] Add **Loot Box / Gacha Simulator**
- [x] Implement **Seed-based Generation** for sharing results
- [ ] Implement **AtloGraph** codebase visualization
- [ ] Develop **SEO-focused FAQ pages** for higher search ranking
- [ ] Finalize **Google AdSense** integration

---

## 📄 License
This project is licensed under the **GNU General Public License v3.0** — see the [LICENSE](LICENSE) file for details.

---

> **Built with ❤️ by [Nonbangkok]** — *Transforming simple tools into a Digital Empire.*
