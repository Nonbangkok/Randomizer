# Technical Plan: Randomizer Utility Empire

แผนงานทางเทคนิคนี้มุ่งเน้นการสร้างเครื่องมือ Utility ที่มีประสิทธิภาพสูงสุดด้วย Rust/WASM โดยเปลี่ยนจากสไตล์ Gamer มาเป็น **Modern Minimalist Aesthetic** ที่เน้นความสะอาดตา (Clean), ใช้งานง่าย (Intuitive UX) และมีความพรีเมียม

## 1. Core Philosophy (UX & Design)
*   **Minimalism:** ตัดส่วนเกินที่ไม่จำเป็นออก เน้น White space และการจัดวางที่สมดุล
*   **Performance First:** โหลดเร็วที่สุดและตอบสนองทันทีด้วย WASM
*   **Premium Feel:** ใช้ Soft shadows, Glassmorphism เล็กน้อย และ Micro-interactions ที่นุ่มนวล
*   **Accessibility:** ตัวอักษรอ่านง่าย (Typography-driven) และรองรับทุกหน้าจอ (Responsive)

## 2. Tech Stack
*   **Backend Logic:** [Rust](https://www.rust-lang.org/) (High-performance computation & Safety)
*   **Web Bridge:** [WebAssembly (WASM)](https://webassembly.org/) ผ่าน `wasm-bindgen`
*   **Frontend:** [Vite](https://vitejs.dev/) + Vanilla JavaScript (เพื่อความเบาและรวดเร็วที่สุด)
*   **Styling:** Vanilla CSS 3 (Custom Design System)
    *   **Colors:** Neutral tones (Slate/Zinc) ตัดด้วย Accent color ที่นุ่มนวล (เช่น Indigo หรือ Teal)
    *   **Typography:** Sans-serif สมัยใหม่ เช่น 'Inter', 'Outfit' หรือ 'system-ui'
*   **SEO:** Semantic HTML5, JSON-LD for Structured Data, และ Lighthouse Optimization

## 3. Project Structure (Monorepo)

```text
Randomizer/
├── 📂 crates/                # Rust Workspace
│   ├── 🦀 core/              # อัลกอริทึมหลัก (Pure Rust)
│   │   ├── name_gen/         # Logic การสร้างชื่อ
│   │   └── security/         # Logic การคำนวณ Entropy/Password
│   └── 🦀 wasm_bridge/       # API interface สำหรับเรียกใช้บน Web Browser
├── 📂 web/                   # Frontend Project (Vite)
│   ├── 📂 src/
│   │   ├── 📂 design-system/ # CSS Utility และ Components (Minimalist style)
│   │   ├── 📂 tools/         # UI ของแต่ละเครื่องมือ
│   │   └── 📂 lib/           # WASM loaders และ Helpers
│   ├── 📂 assets/            # Minimal icons และ Fonts
│   └── 📄 index.html         # SEO Optimized Main Entry
├── 📂 docs/                  # Documentation & Plans
│   ├── IDEA.md
│   ├── TECHNICAL_PLAN.md
│   └── IMPLEMENTATION_PLAN.md
├── 🦀 Cargo.toml             # Rust Workspace Config
└── 📄 package.json           # Frontend Scripts
```

## 4. Key UX Features
*   **Copy-to-Clipboard:** ปุ่มเดียวจบพร้อม Feedback (Toast/Tooltip)
*   **Live Preview:** ผลลัพธ์เปลี่ยนตามการตั้งค่าทันที (Real-time)
*   **One-Click Action:** ปุ่มหลักโดดเด่นและเข้าถึงง่ายที่สุด
*   **Dark/Light Mode:** รองรับทั้งสองโหมดแบบนุ่มนวล (Smooth transition)

## 5. SEO Strategy
*   **Micro-layouts:** แต่ละเครื่องมือจะมี Meta Tags เฉพาะตัว (Title, Description)
*   **Speed Index:** ตั้งเป้า Lighthouse score 95+ ในทุกด้าน

## 6. Algorithm Details

### 6.1 Name Generator (Hybrid Engine)
เราใช้การผสมผสานระหว่าง "คลังคำ" และ "อัลกอริทึม" เพื่อผลลัพธ์ที่ดีที่สุด:
*   **Phase 1: Rule-based Combinatorial (Imagine Forest Style)**
    *   ใช้คลังคำ Segments (Prefixes, Suffixes, Descriptors) แบ่งตามหมวดหมู่ (Fantasy, Sci-Fi)
    *   **Multi-language:** รองรับชุดคำทั้งภาษาไทยและอังกฤษ เพื่อสร้างชื่อที่มีความหมาย (e.g., "ShadowSlayer" หรือ "ผู้พิฆาตเงา")
*   **Phase 2: Syllable-based & Markov Chain (Procedural)**
    *   สำหรับชื่อที่ต้องการความ Unique สูง จะใช้การสุ่มระดับพยางค์ (Phonetic Rules) ใน Rust
    *   ตรวจสอบความไหลลื่นของเสียง (Phonetic smoothing) เพื่อไม่ให้ชื่ออ่านยากเกินไป
*   **Phase 3: Seed-based Randomization**
    *   รองรับการใส่ "Seed" (เช่น ชื่อผู้ใช้หรือตัวเลข) เพื่อให้ได้ผลลัพธ์เดิมทุกครั้ง (Deterministic)
*   **Performance:** ด้วย WASM เราจะทำการ Generate ชื่อล่วงหน้า 1,000+ ชื่อในระดับ Milliseconds เพื่อคัดกรองชื่อที่ตรงตามเงื่อนไขมากที่สุดก่อนแสดงผล

### 6.2 Password Engine (Security-Centric)
*   **Randomness:** ใช้ `OsRng` ผ่าน WASM bridge เพื่อความปลอดภัยสูงสุด
*   **Complexity Control:** ปรับแต่งได้ทั้ง Length, Symbols, Numbers และ Exclusion of ambiguous characters (l, 1, O, 0)
*   **Analyzer:** แสดงผลความแข็งแกร่งเป็น Visual feedback (Strength bar) และค่า Entropy ในหน่วย Bits
*   **User Privacy:** ประมวลผลแบบ Offline 100% บนเครื่องผู้ใช้
*   **Static Assets:** ใช้ SVG สำหรับ Icon ทั้งหมดเพื่อความคมชัดและขนาดเล็ก

## 7. Data & Deployment

### 7.1 Data Management
*   **Embedded Assets:** ฝังคลังคำ (Word Lists) ลงใน WASM binary โดยตรงเพื่อลด HTTP requests
*   **Serialization:** ใช้ `Serde` ใน Rust เพื่อจัดการข้อมูล JSON/MessagePack อย่างรวดเร็ว

### 7.2 Deployment Strategy
*   **Platform:** Cloudflare Pages (Global CDN) เพื่อความเร็วสูงสุดและรองรับ Traffic มหาศาล
*   **Automation:** ใช้ GitHub Actions สำหรับการ Compile Rust -> WASM และ Deploy Frontend โดยอัตโนมัติ

### 7.3 Quality Assurance
*   **Unit Testing:** ทดสอบ Logic การสุ่มใน Rust (Core Logic)
*   **SEO Audit:** ใช้ Lighthouse ตรวจสอบคุณภาพหน้าเว็บทุกครั้งก่อน Deploy