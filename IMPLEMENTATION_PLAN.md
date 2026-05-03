# Implementation Plan: Randomizer Utility Empire

แผนการดำเนินงานนี้แบ่งออกเป็น **5 Phase** ตามลำดับความสำคัญ โดยเริ่มจากการวางรากฐาน (Foundation) ไปจนถึงการ Monetize และ Scale

> **อ้างอิง:** [IDEA.md](./IDEA.md) | [TECHNICAL_PLAN.md](./TECHNICAL_PLAN.md)

---

## Phase 0: Project Initialization (Foundation)
**ระยะเวลา:** 1–2 วัน  
**เป้าหมาย:** วางโครงสร้าง Monorepo ให้พร้อมสำหรับการพัฒนา

### ขั้นตอน:
1.  **สร้าง Rust Workspace**
    *   สร้าง `Cargo.toml` (workspace) ที่ root
    *   สร้าง crate `crates/core` — Pure Rust library สำหรับ logic ทั้งหมด
    *   สร้าง crate `crates/wasm_bridge` — ใช้ `wasm-bindgen` เพื่อ expose API ให้ JavaScript เรียกใช้
    *   ตั้งค่า `wasm-pack` สำหรับ build WASM output

2.  **สร้าง Frontend Project**
    *   Init Vite project ใน `web/` (Vanilla JS template)
    *   ตั้งค่า folder structure: `src/design-system/`, `src/tools/`, `src/lib/`
    *   สร้าง `index.html` พร้อม SEO meta tags พื้นฐาน

3.  **ตั้งค่า Dev Environment**
    *   สร้าง script ใน `package.json` สำหรับ:
        *   `dev` — รัน Vite dev server
        *   `build:wasm` — compile Rust → WASM ด้วย `wasm-pack`
        *   `build` — build ทั้ง WASM และ Frontend
    *   ตั้งค่า `.gitignore` สำหรับ `target/`, `node_modules/`, `pkg/`

### Deliverables:
- [ ] `Cargo.toml` (workspace) ทำงานได้
- [ ] `crates/core/src/lib.rs` — Hello World function
- [ ] `crates/wasm_bridge/src/lib.rs` — Export function ไป JS ได้สำเร็จ
- [ ] `web/` — Vite project ที่เรียก WASM function ได้

---

## Phase 1: Design System & UI Shell
**ระยะเวลา:** 3–4 วัน  
**เป้าหมาย:** สร้าง Design System แบบ Minimalist และ Layout หลักของเว็บ

### ขั้นตอน:

#### 1.1 Design System (CSS)
สร้างไฟล์ `web/src/design-system/` ที่ประกอบด้วย:

*   **`tokens.css`** — CSS Custom Properties (Design Tokens)
    ```css
    :root {
      /* Colors — Neutral */
      --color-bg:       hsl(0 0% 99%);
      --color-surface:  hsl(0 0% 96%);
      --color-border:   hsl(0 0% 88%);
      --color-text:     hsl(0 0% 12%);
      --color-muted:    hsl(0 0% 46%);

      /* Colors — Accent (Indigo) */
      --color-accent:       hsl(234 89% 63%);
      --color-accent-hover: hsl(234 89% 56%);
      --color-accent-soft:  hsl(234 89% 96%);

      /* Typography */
      --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

      /* Spacing */
      --space-xs: 0.25rem;
      --space-sm: 0.5rem;
      --space-md: 1rem;
      --space-lg: 1.5rem;
      --space-xl: 2rem;
      --space-2xl: 3rem;

      /* Radius */
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 16px;
      --radius-full: 9999px;

      /* Shadows */
      --shadow-sm: 0 1px 2px hsl(0 0% 0% / 0.04);
      --shadow-md: 0 4px 12px hsl(0 0% 0% / 0.06);
      --shadow-lg: 0 8px 30px hsl(0 0% 0% / 0.08);

      /* Transitions */
      --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
      --duration-fast: 150ms;
      --duration-normal: 250ms;
    }
    ```

*   **`dark-mode.css`** — Dark mode overrides
    ```css
    [data-theme="dark"] {
      --color-bg:       hsl(0 0% 8%);
      --color-surface:  hsl(0 0% 12%);
      --color-border:   hsl(0 0% 20%);
      --color-text:     hsl(0 0% 92%);
      --color-muted:    hsl(0 0% 56%);
      --color-accent-soft: hsl(234 89% 16%);
    }
    ```

*   **`components.css`** — Reusable component styles
    *   `.btn` — Primary, Secondary, Ghost variants
    *   `.card` — Glassmorphism-inspired container
    *   `.input` — Minimal input fields
    *   `.toast` — Copy feedback notification
    *   `.badge` — Category tags (Fantasy, Sci-Fi, etc.)

#### 1.2 Layout Shell
*   **Header:** โลโก้ (SVG) + Navigation + Dark/Light toggle
*   **Main Content Area:** Container สำหรับ Tool UI (centered, max-width)
*   **Footer:** SEO links, copyright, privacy note ("All processing happens in your browser")

### Deliverables:
- [ ] Design System CSS ครบทุกไฟล์
- [ ] Dark/Light mode toggle ทำงานได้
- [ ] Layout Shell (Header + Main + Footer) responsive ทุกหน้าจอ
- [ ] Google Fonts (Inter) ถูกโหลดอย่างเหมาะสม (preload)

---

## Phase 2: Name Generator (Project A — MVP)
**ระยะเวลา:** 5–7 วัน  
**เป้าหมาย:** เครื่องมือ Name Generator ใช้งานได้จริงตั้งแต่ Rust core ไปจนถึง UI

### ขั้นตอน:

#### 2.1 Rust Core — Word Database
*   **สร้าง Word Lists** ใน `crates/core/src/data/`
    *   `fantasy_en.rs` — Prefixes: `["Shadow", "Dragon", "Crystal", ...]`, Suffixes: `["Walker", "Blade", "Storm", ...]`
    *   `fantasy_th.rs` — Prefixes: `["เงา", "มังกร", "ผลึก", ...]`, Suffixes: `["นักรบ", "ดาบ", "พายุ", ...]`
    *   `scifi_en.rs` — Prefixes: `["Cyber", "Nano", "Astro", ...]`
    *   `scifi_th.rs` — ชุดคำภาษาไทยสำหรับ Sci-Fi
    *   `descriptors.rs` — คำขยาย: `["The Brave", "Of the North", ...]`
*   **ใช้ `include_str!` หรือ const arrays** เพื่อฝังข้อมูลลงใน binary โดยตรง

#### 2.2 Rust Core — Generation Engine
*   **สร้างไฟล์ `crates/core/src/name_gen/`:**
    *   `mod.rs` — Public API: `generate_names(config: NameConfig) -> Vec<String>`
    *   `combinatorial.rs` — **Phase 1 logic:** สุ่มเลือก Prefix + Suffix ตาม Template
    *   `syllable.rs` — **Phase 2 logic:** สร้างชื่อจากพยางค์ (CVC, CV patterns)
    *   `config.rs` — Struct สำหรับตั้งค่า:
        ```rust
        pub struct NameConfig {
            pub genre: Genre,           // Fantasy, SciFi, RPG
            pub language: Language,     // EN, TH
            pub method: GenMethod,      // Combinatorial, Syllable, Hybrid
            pub count: usize,           // จำนวนชื่อที่ต้องการ
            pub seed: Option<u64>,      // Seed สำหรับ Deterministic output
            pub min_length: usize,
            pub max_length: usize,
        }
        ```
*   **Weighted Random Selection:** ใช้ `rand` crate กับ `WeightedIndex` สำหรับการถ่วงน้ำหนัก
*   **Phonetic Smoothing:** ตรวจสอบว่าพยางค์ที่ต่อกันอ่านออกเสียงได้ (ไม่มีพยัญชนะซ้อนมากเกินไป)

#### 2.3 WASM Bridge
*   **Expose API** ใน `crates/wasm_bridge/src/lib.rs`:
    ```rust
    #[wasm_bindgen]
    pub fn generate_names(config_json: &str) -> String {
        let config: NameConfig = serde_json::from_str(config_json).unwrap();
        let names = core::name_gen::generate_names(&config);
        serde_json::to_string(&names).unwrap()
    }
    ```
*   **Build & Test:** ใช้ `wasm-pack build --target web` แล้วทดสอบใน browser

#### 2.4 Frontend — Name Generator UI
*   **สร้างไฟล์ `web/src/tools/name-generator/`:**
    *   `index.html` — หน้าเฉพาะสำหรับ Name Generator (SEO-optimized)
    *   `name-generator.js` — Logic สำหรับ UI interaction
    *   `name-generator.css` — Style เฉพาะหน้า (ถ้าจำเป็น)

*   **UI Components:**
    *   **Genre Selector:** ปุ่มแบบ Segmented control (Fantasy | Sci-Fi | RPG)
    *   **Language Toggle:** EN / TH switch
    *   **Generation Method:** Dropdown หรือ Toggle (Quick / Unique / Seeded)
    *   **Seed Input:** Text field (แสดงเฉพาะเมื่อเลือก Seeded mode)
    *   **Generate Button:** ปุ่มหลักขนาดใหญ่ พร้อม micro-animation
    *   **Results Grid:** แสดงชื่อ 6–12 ชื่อในรูปแบบ Card grid
    *   **Copy Button:** แต่ละ Card มีปุ่ม Copy พร้อม Toast feedback
    *   **Regenerate Button:** สุ่มใหม่ทั้งหมด (พร้อม transition animation)

### Deliverables:
- [ ] Rust unit tests ผ่าน: `cargo test` ใน `crates/core`
- [ ] WASM build สำเร็จ: `wasm-pack build`
- [ ] UI ทำงานได้ครบ: เลือก Genre → กด Generate → เห็นผลลัพธ์ → Copy ได้
- [ ] Responsive: ทำงานได้ดีทั้ง Mobile และ Desktop

---

## Phase 3: Password Generator (Project B — MVP)
**ระยะเวลา:** 4–5 วัน  
**เป้าหมาย:** เครื่องมือ Password Generator + Strength Analyzer ที่ปลอดภัยสูงสุด

### ขั้นตอน:

#### 3.1 Rust Core — Password Engine
*   **สร้าง `crates/core/src/security/`:**
    *   `password_gen.rs` — สร้าง Password ตาม Config:
        ```rust
        pub struct PasswordConfig {
            pub length: usize,             // 8–128
            pub uppercase: bool,
            pub lowercase: bool,
            pub numbers: bool,
            pub symbols: bool,
            pub exclude_ambiguous: bool,   // ตัด l, 1, O, 0, I
            pub custom_exclude: String,    // ตัวอักษรที่ไม่ต้องการ
        }
        ```
    *   `entropy.rs` — คำนวณ Entropy (bits) จาก character pool size:
        *   Formula: `entropy = length × log2(pool_size)`
    *   `analyzer.rs` — วิเคราะห์ความแข็งแกร่ง:
        *   ตรวจจับ Sequential patterns (`abc`, `123`, `qwerty`)
        *   ตรวจจับ Repeated characters (`aaa`, `111`)
        *   ตรวจจับ Common passwords (ฝัง Top 1000 list)
        *   คำนวณ Time-to-crack estimates (แบ่งตาม: Online attack, Offline fast, Offline slow)
    *   `strength.rs` — แปลง Entropy เป็น Strength level:
        *   `< 28 bits` → Very Weak 🔴
        *   `28–35 bits` → Weak 🟠
        *   `36–59 bits` → Fair 🟡
        *   `60–127 bits` → Strong 🟢
        *   `≥ 128 bits` → Very Strong 💎

*   **ใช้ `OsRng`** (ผ่าน `getrandom` crate สำหรับ WASM target) เพื่อรับประกันความปลอดภัย

#### 3.2 WASM Bridge
*   Export functions:
    *   `generate_password(config_json: &str) -> String`
    *   `analyze_password(password: &str) -> String` (return JSON: entropy, strength, time_to_crack, warnings)

#### 3.3 Frontend — Password Generator UI
*   **UI Components:**
    *   **Password Display:** แสดง Password ในกรอบขนาดใหญ่ พร้อม monospace font
    *   **Copy Button:** พร้อม visual feedback (icon เปลี่ยนเป็น ✓)
    *   **Length Slider:** ปรับความยาว 8–128 พร้อมตัวเลขแสดง
    *   **Character Toggles:** Switches สำหรับ Uppercase / Lowercase / Numbers / Symbols
    *   **Exclude Ambiguous:** Checkbox ตัดตัวอักษรที่คล้ายกัน
    *   **Strength Meter:** Visual bar + Label (Weak → Very Strong) + Entropy bits
    *   **Time-to-Crack Display:** แสดงเวลาประเมินการ Brute-force (e.g., "3 centuries")
    *   **Real-time Update:** ทุกการเปลี่ยน Settings จะ regenerate ทันที (ไม่ต้องกดปุ่ม)
    *   **Privacy Badge:** แสดง "🔒 All processing happens locally" ใต้เครื่องมือ

### Deliverables:
- [ ] Rust unit tests: ทดสอบ entropy calculation, pattern detection, edge cases
- [ ] WASM integration: JS เรียก generate + analyze ได้
- [ ] UI ครบ: Slider → Toggles → Generate → Strength feedback → Copy
- [ ] Security audit: ตรวจสอบว่าไม่มี data ถูกส่งออกจาก browser

---

## Phase 4: SEO, Polish & Launch
**ระยะเวลา:** 3–4 วัน  
**เป้าหมาย:** เตรียมเว็บให้พร้อมสำหรับการ Launch จริง

### ขั้นตอน:

#### 4.1 SEO Optimization
*   **Meta Tags ทุกหน้า:**
    *   `<title>` — ตรงกับ Target keyword (e.g., "Fantasy Name Generator — Free & Instant")
    *   `<meta name="description">` — 155 ตัวอักษร ที่ดึงดูด CTR
    *   Open Graph tags สำหรับ Social sharing
*   **Structured Data (JSON-LD):**
    *   `WebApplication` schema สำหรับแต่ละเครื่องมือ
    *   `FAQPage` schema สำหรับหน้า FAQ
*   **Technical SEO:**
    *   `sitemap.xml` — Auto-generated
    *   `robots.txt` — อนุญาต crawling ทุกหน้า
    *   Canonical URLs
    *   `<link rel="preload">` สำหรับ WASM file และ Font

#### 4.2 Performance Optimization
*   **WASM Loading:**
    *   Lazy-load WASM module (โหลดเมื่อผู้ใช้เข้าหน้า Tool เท่านั้น)
    *   แสดง Skeleton loader ระหว่างรอ WASM initialize
*   **Asset Optimization:**
    *   Inline critical CSS
    *   Compress WASM with Brotli
    *   Optimize SVG icons (SVGO)
*   **เป้าหมาย Lighthouse:**
    *   Performance: ≥ 95
    *   Accessibility: ≥ 95
    *   Best Practices: ≥ 95
    *   SEO: 100

#### 4.3 UX Polish
*   **Micro-animations:**
    *   Generate button: Subtle pulse/ripple effect เมื่อกด
    *   Results: Fade-in stagger animation เมื่อผลลัพธ์ปรากฏ
    *   Copy: Icon morph (📋 → ✓) พร้อม toast notification
    *   Theme toggle: Smooth color transition (ไม่กระพริบ)
*   **Keyboard Shortcuts:**
    *   `Space/Enter` — Generate ใหม่
    *   `Ctrl+C` — Copy ผลลัพธ์ตัวแรก
*   **Error States:**
    *   แสดง Friendly message เมื่อ WASM โหลดไม่สำเร็จ
    *   Fallback ไป JS-based generation ถ้า WASM ไม่ support

#### 4.4 Deployment Setup
*   **GitHub Repository:** ตั้งค่า repo พร้อม README.md
*   **CI/CD Pipeline (GitHub Actions):**
    ```yaml
    # Workflow:
    # 1. cargo test          — ทดสอบ Rust logic
    # 2. wasm-pack build     — compile WASM
    # 3. npm run build       — build Vite
    # 4. Deploy to Cloudflare Pages
    ```
*   **Custom Domain:** เชื่อมต่อ Domain name
*   **Analytics:** ติดตั้ง Plausible หรือ Umami (Privacy-friendly analytics)

### Deliverables:
- [x] Lighthouse score ≥ 95 ทุกด้าน
- [ ] SEO: Meta tags (Done), JSON-LD (Partial), sitemap.xml (Pending)
- [x] CI/CD: Push to `main` → Auto deploy
- [x] เว็บ Live บน Production domain

---

## Phase 5: Monetization & Expansion (Post-Launch)
**ระยะเวลา:** ดำเนินการต่อเนื่อง  
**เป้าหมาย:** สร้างรายได้และขยายชุดเครื่องมือ

### ขั้นตอน:

#### 5.1 Monetization
*   **Google AdSense:** สมัครเมื่อ Traffic เริ่มมา (ต้องมี Content เพียงพอ)
*   **Ad Placement:** วางโฆษณาแบบไม่รบกวน UX:
    *   Banner ด้านบน (Header)
    *   Native ads ระหว่าง Results
    *   Sidebar ads (Desktop only)
*   **Ezoic Migration:** เปลี่ยนไป Ezoic เมื่อ Traffic > 10k sessions/month (RPM สูงกว่า)

#### 5.2 Content & SEO Growth
*   **Blog Section:** เขียนบทความ SEO (e.g., "100 Best Fantasy Names for Your RPG Character")
*   **FAQ Pages:** ตอบคำถามที่คนค้นหาบ่อย (เพิ่ม Long-tail keyword ranking)
*   **Backlink Strategy:** Guest posts ใน Gaming communities

#### 5.3 Tool Expansion (จาก IDEA.md)
เรียงลำดับความสำคัญตาม Search volume และ Difficulty:
1.  🎰 **Loot Box / Gacha Simulator** — จำลอง Drop rate สำหรับเกมยอดนิยม
2.  🎡 **Game Backlog Wheel** — สุ่มเกมจาก Library ของผู้ใช้
3.  ⚔️ **Nuzlocke / Challenge Generator** — กฏแบบ Hardcore สำหรับ Elden Ring, Pokémon
4.  📍 **Map Drop Point Randomizer** — จุด Drop สำหรับ Battle Royale
5.  💡 **Game Idea Generator** — Brainstorm เกมใหม่สำหรับ Indie Dev

### Deliverables:
- [ ] Ad revenue เริ่มเข้า
- [ ] อย่างน้อย 1 เครื่องมือใหม่ทุก 2–3 สัปดาห์
- [ ] Monthly Traffic Growth ≥ 20%

---

## สรุป Timeline

| Phase | ชื่อ | ระยะเวลา | Status |
|-------|------|----------|--------|
| 0 | Project Initialization | 1–2 วัน | ✅ Completed |
| 1 | Design System & UI Shell | 3–4 วัน | ✅ Completed |
| 2 | Name Generator (MVP) | 5–7 วัน | ✅ Completed |
| 3 | Password Generator (MVP) | 4–5 วัน | ✅ Completed |
| 4 | SEO, Polish & Launch | 3–4 วัน | 🔄 In Progress |
| 5 | Monetization & Expansion | ต่อเนื่อง | 🔄 In Progress |

**รวมประมาณ 16–22 วัน** สำหรับ Phase 0–4 (ถึง Launch)


### ⏳ สิ่งที่ "ยังเหลือ" ตามแผน (Remaining Tasks)

#### **1. Phase 4: SEO & Final Polish (ยังไม่ครบถ้วน)**
*   [x] **Sitemap.xml & Robots.txt:** สร้างเรียบร้อยแล้วเพื่อให้ Search Engine จัดอันดับเว็บได้ดีขึ้น
*   [ ] **Lighthouse Optimization:** ตรวจสอบคะแนน Performance, SEO ให้ได้ 95+ (ตอนนี้เว็บเบาอยู่แล้ว น่าจะผ่านได้ไม่ยาก)
*   [ ] **JSON-LD ในหน้าย่อย:** ตอนนี้มีแค่หน้าหลัก เราควรเพิ่ม Structured Data ในหน้าเครื่องมือแต่ละตัวด้วย

#### **2. Phase 5: Monetization & Content (เริ่มไปบางส่วน)**
*   [ ] **Blog Section (สำคัญที่สุดตอนนี้):** AdSense จะไม่ผ่านถ้าเว็บมีแต่เครื่องมือ เราต้องทำระบบ Blog และเขียนบทความ SEO อย่างน้อย 5-10 บทความ
*   [ ] **Event Tracking:** ตั้งค่า GA4 ให้นับว่าคนกดใช้เครื่องมือตัวไหนมากที่สุด (เพื่อวิเคราะห์ว่าควรขยายตัวไหนต่อ)

#### **3. Tool Expansion (อนาคต)**
*   [ ] **🎰 Loot Box / Gacha Simulator**
*   [ ] **🎡 Game Backlog Wheel (Advanced version)**