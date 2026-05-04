import { showToast } from '../../lib/toast.js';
import { makeId, pushHistory, toggleFavorite } from '../../lib/storage.js';
import { mountHistoryPanel, favoriteButton } from '../../lib/history-panel.js';
import { readParams, writeParams, copyShareLink, shareButtonHtml } from '../../lib/share.js';
import { mountAd } from '../../lib/ads.js';

const TOOL = 'name-generator';
const SHARE_KEYS = ['genre', 'language', 'method', 'seed', 'descriptor'];
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
  const advToggle = root.querySelector('[data-ng-adv-toggle]');
  const advPanel = root.querySelector('[data-ng-adv-panel]');
  const advChevron = advToggle.querySelector('.ng-adv__chevron');

  /* --- Advanced panel toggle --- */
  let advOpen = false;
  function setAdvOpen(open) {
    advOpen = open;
    advPanel.classList.toggle('is-open', advOpen);
    advToggle.setAttribute('aria-expanded', String(advOpen));
    advChevron.style.transform = advOpen ? 'rotate(180deg)' : '';
  }
  advToggle.addEventListener('click', () => setAdvOpen(!advOpen));

  /* --- Seed row visibility --- */
  function syncSeedVisibility() {
    seedRow.hidden = methodSelect.value !== 'seeded';
  }
  methodSelect.addEventListener('change', syncSeedVisibility);
  syncSeedVisibility();

  hydrateFromUrl();
  syncSeedVisibility();

  /* If URL had advanced params, auto-open the panel */
  const p = readParams();
  if (p.get('method') || p.get('seed') || p.get('descriptor')) {
    setAdvOpen(true);
  }

  function hydrateFromUrl() {
    const p = readParams();
    if (!SHARE_KEYS.some((k) => p.has(k))) return;
    for (const name of ['genre', 'language']) {
      const v = p.get(name);
      if (v) {
        const radio = form.querySelector(`input[name="${name}"][value="${cssEscape(v)}"]`);
        if (radio) radio.checked = true;
      }
    }
    const method = p.get('method');
    if (method && [...methodSelect.options].some((o) => o.value === method)) {
      methodSelect.value = method;
    }
    const seed = p.get('seed');
    if (seed) seedInput.value = seed;
    const desc = p.get('descriptor');
    if (desc === '1' || desc === 'on' || desc === 'true') {
      const cb = form.querySelector('input[name="descriptor"]');
      if (cb) cb.checked = true;
    }
  }

  function syncUrl() {
    const fd = new FormData(form);
    const updates = {
      genre: fd.get('genre'),
      language: fd.get('language'),
      method: fd.get('method'),
      seed: fd.get('method') === 'seeded' ? (fd.get('seed') || '') : null,
      descriptor: fd.get('descriptor') === 'on' ? '1' : null,
    };
    writeParams(updates);
  }

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
    grid.innerHTML = names.map((n, i) => {
      const entry = { id: makeId(n), value: n };
      return `
      <article class="ng-card" style="--i:${i}" data-entry-id="${entry.id}" data-entry-value="${escapeHtml(n)}">
        <span class="ng-card__name">${escapeHtml(n)}</span>
        <span class="ng-card__actions">
        ${favoriteButton(TOOL, entry)}
        <button class="btn btn--ghost btn--icon" data-copy="${escapeHtml(n)}" aria-label="Copy ${escapeHtml(n)}" title="Copy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        </span>
      </article>
    `;
    }).join('');
  }

  grid.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-entry-id]');
    if (!card) return;
    const entry = { id: card.dataset.entryId, value: card.dataset.entryValue };

    if (e.target.closest('[data-copy]')) {
      try {
        await navigator.clipboard.writeText(entry.value);
        pushHistory(TOOL, entry);
        showToast('Copied');
      } catch {
        showToast('Copy failed');
      }
      return;
    }

    const favBtn = e.target.closest('[data-fav-id]');
    if (favBtn) {
      const nowFav = toggleFavorite(TOOL, entry);
      if (nowFav) pushHistory(TOOL, entry);
      favBtn.classList.toggle('is-on', nowFav);
      favBtn.setAttribute('aria-pressed', String(nowFav));
      favBtn.querySelector('svg')?.setAttribute('fill', nowFav ? 'currentColor' : 'none');
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
  form.addEventListener('change', () => { syncUrl(); if (grid.children.length) generate(); });
  form.addEventListener('input', (e) => { if (e.target === seedInput) syncUrl(); });

  const shareBtn = root.querySelector('[data-share-btn]');
  shareBtn.addEventListener('click', () => { syncUrl(); copyShareLink(); });

  mountAd(root.querySelector('[data-ad-slot="ng-leaderboard"]'), { format: 'leaderboard' });

  const panel = root.querySelector('[data-ng-history]');
  mountHistoryPanel(panel, { tool: TOOL, title: 'Names history' });

  return { generate };
}

function template() {
  return `
    <form class="ng" data-ng-form>
      <div class="ng__primary">
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
      </div>

      <button type="button" class="ng-adv__toggle" data-ng-adv-toggle aria-expanded="false">
        <svg class="ng-adv__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>Advanced</span>
        <svg class="ng-adv__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div class="ng-adv__panel" data-ng-adv-panel>
        <div class="ng-adv__inner">
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
      </div>

      <div class="ng__actions">
        <button type="submit" class="btn btn--primary ng-generate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" />
          </svg>
          Generate
        </button>
        ${shareButtonHtml({ label: 'Share' })}
        <span class="ng-status" data-ng-status aria-live="polite"></span>
      </div>

      <div data-ad-slot="ng-leaderboard"></div>

      <div class="ng-results" data-ng-results></div>
    </form>
    <div data-ng-history></div>
  `;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function cssEscape(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '');
}

function hashSeed(input) {
  let h = 2166136261n;
  for (const ch of input) {
    h ^= BigInt(ch.codePointAt(0));
    h = (h * 16777619n) & 0xffffffffffffffffn;
  }
  return Number(h & 0x1fffffffffffffn);
}
