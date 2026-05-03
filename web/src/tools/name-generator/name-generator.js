import { showToast } from '../../lib/toast.js';

let wasmGenerate;

export function setGenerator(fn) {
  wasmGenerate = fn;
}

export function mountNameGenerator(root) {
  root.innerHTML = template();

  const form = root.querySelector('[data-ng-form]');
  const grid = root.querySelector('[data-ng-results]');
  const seedInput = root.querySelector('[data-ng-seed]');
  const seedRow = root.querySelector('[data-ng-seed-row]');
  const methodSelect = root.querySelector('[data-ng-method]');
  const status = root.querySelector('[data-ng-status]');

  function syncSeedVisibility() {
    seedRow.hidden = methodSelect.value !== 'seeded';
  }
  methodSelect.addEventListener('change', syncSeedVisibility);
  syncSeedVisibility();

  function readConfig() {
    const fd = new FormData(form);
    const methodValue = fd.get('method');
    let method = 'combinatorial';
    let seed = null;
    if (methodValue === 'syllable') method = 'syllable';
    else if (methodValue === 'hybrid') method = 'hybrid';
    else if (methodValue === 'seeded') {
      method = 'hybrid';
      const raw = fd.get('seed');
      if (raw && raw.toString().trim()) {
        seed = hashSeed(raw.toString().trim());
      } else {
        seed = 1;
      }
    }
    return {
      genre: fd.get('genre'),
      language: fd.get('language'),
      method,
      count: 8,
      seed,
      min_length: 4,
      max_length: 24,
      include_descriptor: fd.get('descriptor') === 'on',
    };
  }

  function render(names) {
    if (!names.length) {
      grid.innerHTML = `<p class="ng-empty">No names generated. Try different settings.</p>`;
      return;
    }
    grid.innerHTML = names.map((n, i) => `
      <article class="ng-card" style="--i:${i}">
        <span class="ng-card__name">${escapeHtml(n)}</span>
        <button class="btn btn--ghost btn--icon" data-copy="${escapeHtml(n)}" aria-label="Copy ${escapeHtml(n)}" title="Copy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </article>
    `).join('');
  }

  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      showToast('Copied');
    } catch {
      showToast('Copy failed');
    }
  });

  function generate() {
    if (!wasmGenerate) {
      status.textContent = 'WASM still loading…';
      return;
    }
    try {
      const cfg = readConfig();
      const json = wasmGenerate(JSON.stringify(cfg));
      const names = JSON.parse(json);
      render(names);
      status.textContent = `${names.length} names generated`;
    } catch (err) {
      console.error(err);
      status.textContent = 'Generation failed.';
    }
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); generate(); });
  form.addEventListener('change', () => { if (grid.children.length) generate(); });

  return { generate };
}

function template() {
  return `
    <form class="ng" data-ng-form>
      <div class="ng__controls">
        <fieldset class="ng-field">
          <legend>Genre</legend>
          <div class="segmented">
            <label><input type="radio" name="genre" value="fantasy" checked /><span>Fantasy</span></label>
            <label><input type="radio" name="genre" value="scifi" /><span>Sci-Fi</span></label>
            <label><input type="radio" name="genre" value="rpg" /><span>RPG</span></label>
          </div>
        </fieldset>

        <fieldset class="ng-field">
          <legend>Language</legend>
          <div class="segmented">
            <label><input type="radio" name="language" value="en" checked /><span>EN</span></label>
            <label><input type="radio" name="language" value="th" /><span>TH</span></label>
          </div>
        </fieldset>

        <div class="ng-field">
          <label for="ng-method">Method</label>
          <select id="ng-method" name="method" class="input" data-ng-method>
            <option value="combinatorial">Quick (prefix + suffix)</option>
            <option value="syllable">Unique (phonetic)</option>
            <option value="hybrid">Hybrid</option>
            <option value="seeded">Seeded (reproducible)</option>
          </select>
        </div>

        <div class="ng-field" data-ng-seed-row hidden>
          <label for="ng-seed">Seed</label>
          <input id="ng-seed" name="seed" type="text" class="input" placeholder="e.g. my-campaign" data-ng-seed />
        </div>

        <label class="ng-check">
          <input type="checkbox" name="descriptor" />
          <span>Add descriptor (e.g. "the Brave")</span>
        </label>
      </div>

      <div class="ng__actions">
        <button type="submit" class="btn btn--primary ng-generate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" />
          </svg>
          Generate
        </button>
        <span class="ng-status" data-ng-status aria-live="polite"></span>
      </div>

      <div class="ng-results" data-ng-results></div>
    </form>
  `;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function hashSeed(input) {
  let h = 2166136261n;
  for (const ch of input) {
    h ^= BigInt(ch.codePointAt(0));
    h = (h * 16777619n) & 0xffffffffffffffffn;
  }
  return Number(h & 0x1fffffffffffffn);
}
