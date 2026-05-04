import { showToast } from '../../lib/toast.js';
import { makeId, pushHistory, toggleFavorite, isFavorite } from '../../lib/storage.js';
import { mountHistoryPanel } from '../../lib/history-panel.js';
import { readParams, writeParams, copyShareLink, shareButtonHtml } from '../../lib/share.js';
import { mountAd } from '../../lib/ads.js';

const TOOL = 'password-generator';
const BOOL_KEYS = ['uppercase', 'lowercase', 'numbers', 'symbols', 'exclude_ambiguous'];
let wasmGenerate;
let wasmAnalyze;

export function setBackends({ generate, analyze }) {
  wasmGenerate = generate;
  wasmAnalyze = analyze;
}

const STRENGTH_PCT = {
  'very-weak': 15,
  'weak': 30,
  'fair': 55,
  'strong': 80,
  'very-strong': 100,
};

export function mountPasswordGenerator(root) {
  root.innerHTML = template();

  const form = root.querySelector('[data-pg-form]');
  const display = root.querySelector('[data-pg-display]');
  const copyBtn = root.querySelector('[data-pg-copy]');
  const refreshBtn = root.querySelector('[data-pg-refresh]');
  const favBtn = root.querySelector('[data-pg-fav]');
  const lengthInput = root.querySelector('[data-pg-length]');
  const lengthOut = root.querySelector('[data-pg-length-out]');
  const meterBar = root.querySelector('[data-pg-meter-bar]');
  const meterLabel = root.querySelector('[data-pg-meter-label]');
  const entropyOut = root.querySelector('[data-pg-entropy]');
  const ttcOut = root.querySelector('[data-pg-ttc]');
  const warningsList = root.querySelector('[data-pg-warnings]');

  function readConfig() {
    const fd = new FormData(form);
    return {
      length: Number(fd.get('length')),
      uppercase: fd.get('uppercase') === 'on',
      lowercase: fd.get('lowercase') === 'on',
      numbers: fd.get('numbers') === 'on',
      symbols: fd.get('symbols') === 'on',
      exclude_ambiguous: fd.get('exclude_ambiguous') === 'on',
      custom_exclude: '',
    };
  }

  function regenerate() {
    if (!wasmGenerate) return;
    const cfg = readConfig();
    if (!cfg.uppercase && !cfg.lowercase && !cfg.numbers && !cfg.symbols) {
      display.textContent = 'Select at least one character set';
      meterBar.style.width = '0%';
      meterBar.dataset.strength = 'very-weak';
      meterLabel.textContent = '—';
      entropyOut.textContent = '0 bits';
      ttcOut.innerHTML = '';
      warningsList.innerHTML = '';
      return;
    }
    try {
      const password = wasmGenerate(JSON.stringify(cfg));
      display.textContent = password;
      analyze(password);
    } catch (err) {
      console.error(err);
      display.textContent = 'Generation failed';
    }
  }

  function analyze(password) {
    if (!wasmAnalyze) return;
    const a = JSON.parse(wasmAnalyze(password));
    const pct = STRENGTH_PCT[a.strength] ?? 0;
    meterBar.style.width = pct + '%';
    meterBar.dataset.strength = a.strength;
    meterLabel.textContent = a.strength_label;
    entropyOut.textContent = `${a.entropy.toFixed(1)} bits`;
    ttcOut.innerHTML = `
      <span><b>Online:</b> ${a.time_to_crack.online_throttled}</span>
      <span><b>Offline (slow):</b> ${a.time_to_crack.offline_slow}</span>
      <span><b>Offline (fast):</b> ${a.time_to_crack.offline_fast}</span>
    `;
    warningsList.innerHTML = a.warnings.length
      ? a.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')
      : '';
  }

  hydrateFromUrl();

  function hydrateFromUrl() {
    const p = readParams();
    const len = parseInt(p.get('length'), 10);
    if (Number.isFinite(len) && len >= 8 && len <= 64) {
      lengthInput.value = String(len);
      lengthOut.textContent = lengthInput.value;
    }
    for (const key of BOOL_KEYS) {
      if (!p.has(key)) continue;
      const cb = form.querySelector(`input[name="${key}"]`);
      if (cb) cb.checked = p.get(key) === '1';
    }
  }

  function syncUrl() {
    const fd = new FormData(form);
    const updates = { length: fd.get('length') };
    for (const key of BOOL_KEYS) {
      updates[key] = fd.get(key) === 'on' ? '1' : '0';
    }
    writeParams(updates);
  }

  lengthInput.addEventListener('input', () => {
    lengthOut.textContent = lengthInput.value;
    syncUrl();
    regenerate();
  });
  form.addEventListener('change', () => { syncUrl(); regenerate(); });
  refreshBtn.addEventListener('click', regenerate);

  const shareBtn = root.querySelector('[data-share-btn]');
  shareBtn.addEventListener('click', () => { syncUrl(); copyShareLink(); });

  function currentEntry() {
    const value = display.textContent;
    return { id: makeId(value), value };
  }

  function syncFav() {
    const on = isFavorite(TOOL, currentEntry().id);
    favBtn.classList.toggle('is-on', on);
    favBtn.setAttribute('aria-pressed', String(on));
    favBtn.querySelector('svg')?.setAttribute('fill', on ? 'currentColor' : 'none');
  }

  copyBtn.addEventListener('click', async () => {
    const entry = currentEntry();
    try {
      await navigator.clipboard.writeText(entry.value);
      pushHistory(TOOL, entry);
      showToast('Copied');
    } catch {
      showToast('Copy failed');
    }
  });

  favBtn.addEventListener('click', () => {
    const entry = currentEntry();
    if (!entry.value || entry.value.length < 4) return;
    const nowFav = toggleFavorite(TOOL, entry);
    if (nowFav) pushHistory(TOOL, entry);
    syncFav();
  });

  // Refresh fav state whenever a new password is shown.
  const observer = new MutationObserver(syncFav);
  observer.observe(display, { childList: true, characterData: true, subtree: true });

  mountAd(root.querySelector('[data-ad-slot="pg-leaderboard"]'), { format: 'leaderboard' });

  const panel = root.querySelector('[data-pg-history]');
  mountHistoryPanel(panel, { tool: TOOL, title: 'Password history' });

  return { regenerate };
}

function template() {
  return `
    <form class="pg" data-pg-form>
      <div class="pg-display-row">
        <output class="pg-display" data-pg-display aria-live="polite">…</output>
        <button type="button" class="btn btn--ghost btn--icon" data-pg-refresh aria-label="Regenerate" title="Regenerate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" />
          </svg>
        </button>
        <button type="button" class="btn btn--ghost btn--icon hp-fav" data-pg-fav aria-pressed="false" aria-label="Favorite" title="Favorite">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <button type="button" class="btn btn--primary" data-pg-copy>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy
        </button>
      </div>

      <div class="pg-meter">
        <div class="pg-meter__track">
          <div class="pg-meter__bar" data-pg-meter-bar data-strength="very-weak"></div>
        </div>
        <div class="pg-meter__info">
          <span class="pg-meter__label" data-pg-meter-label>—</span>
          <span class="pg-meter__entropy" data-pg-entropy>0 bits</span>
        </div>
        <div class="pg-ttc" data-pg-ttc></div>
        <ul class="pg-warnings" data-pg-warnings></ul>
      </div>

      <div class="pg-controls">
        <div class="pg-field pg-field--full">
          <label for="pg-length">Length: <output data-pg-length-out>16</output></label>
          <input id="pg-length" name="length" type="range" min="8" max="64" value="16" data-pg-length />
        </div>

        <label class="pg-toggle"><input type="checkbox" name="uppercase" checked /><span>Uppercase (A–Z)</span></label>
        <label class="pg-toggle"><input type="checkbox" name="lowercase" checked /><span>Lowercase (a–z)</span></label>
        <label class="pg-toggle"><input type="checkbox" name="numbers" checked /><span>Numbers (0–9)</span></label>
        <label class="pg-toggle"><input type="checkbox" name="symbols" /><span>Symbols (!@#…)</span></label>
        <label class="pg-toggle"><input type="checkbox" name="exclude_ambiguous" /><span>Exclude ambiguous (l, 1, O, 0…)</span></label>
      </div>

      <div class="pg-share-row">
        ${shareButtonHtml({ label: 'Share config' })}
        <span class="pg-share-hint">Shares your settings only — never the password.</span>
      </div>

      <div data-ad-slot="pg-leaderboard"></div>

    </form>
    <div data-pg-history></div>
  `;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
