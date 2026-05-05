import { showToast } from '../../lib/toast.js';
import { makeId, pushHistory, toggleFavorite, isFavorite, type StorageEntry } from '../../lib/storage.js';
import { mountHistoryPanel } from '../../lib/history-panel.js';
import { readParams, writeParams, copyShareLink, shareButtonHtml, type ParamValue } from '../../lib/share.js';
import { mountAd } from '../../lib/ads.js';
import { getWasm } from '../../lib/wasm.js';
import { escapeHtml, hydrateForm, setStatus, type HydrateRule } from '../../lib/dom.js';

const TOOL = 'password-generator';
const BOOL_KEYS = ['uppercase', 'lowercase', 'numbers', 'symbols', 'exclude_ambiguous'] as const;
type BoolKey = (typeof BOOL_KEYS)[number];

// All boolean params on this tool are serialised as the literal '1'.
const BOOL_TRUTHY = ['1'] as const;

const HYDRATE_RULES: readonly HydrateRule[] = BOOL_KEYS.map((name) => ({
  kind: 'checkbox',
  name,
  truthy: BOOL_TRUTHY,
}));

type Strength = 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';

interface PasswordConfig {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  exclude_ambiguous: boolean;
  custom_exclude: string;
}

interface PasswordAnalysis {
  strength: Strength;
  strength_label: string;
  entropy: number;
  time_to_crack: {
    online_throttled: string;
    offline_slow: string;
    offline_fast: string;
  };
  warnings: string[];
}

export interface PasswordGeneratorHandle {
  regenerate: () => Promise<void>;
}

const STRENGTH_PCT: Record<Strength, number> = {
  'very-weak': 15,
  'weak': 30,
  'fair': 55,
  'strong': 80,
  'very-strong': 100,
};

export function mountPasswordGenerator(root: HTMLElement): PasswordGeneratorHandle {
  root.innerHTML = template();

  const form = root.querySelector<HTMLFormElement>('[data-pg-form]')!;
  const display = root.querySelector<HTMLOutputElement>('[data-pg-display]')!;
  const copyBtn = root.querySelector<HTMLButtonElement>('[data-pg-copy]')!;
  const refreshBtn = root.querySelector<HTMLButtonElement>('[data-pg-refresh]')!;
  const favBtn = root.querySelector<HTMLButtonElement>('[data-pg-fav]')!;
  const lengthInput = root.querySelector<HTMLInputElement>('[data-pg-length]')!;
  const lengthOut = root.querySelector<HTMLOutputElement>('[data-pg-length-out]')!;
  const meterBar = root.querySelector<HTMLElement>('[data-pg-meter-bar]')!;
  const meterLabel = root.querySelector<HTMLElement>('[data-pg-meter-label]')!;
  const entropyOut = root.querySelector<HTMLElement>('[data-pg-entropy]')!;
  const ttcOut = root.querySelector<HTMLElement>('[data-pg-ttc]')!;
  const warningsList = root.querySelector<HTMLUListElement>('[data-pg-warnings]')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;

  function readConfig(): PasswordConfig {
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

  async function regenerate(): Promise<void> {
    const cfg = readConfig();
    if (!cfg.uppercase && !cfg.lowercase && !cfg.numbers && !cfg.symbols) {
      display.textContent = '—';
      meterBar.style.width = '0%';
      meterBar.dataset.strength = 'very-weak';
      meterLabel.textContent = '—';
      entropyOut.textContent = '0 bits';
      ttcOut.innerHTML = '';
      warningsList.innerHTML = '';
      setStatus(status, 'error', 'Select at least one character set');
      return;
    }
    try {
      const { generate_password, analyze_password } = await getWasm();
      const password = generate_password(JSON.stringify(cfg));
      display.textContent = password;
      analyze(password, analyze_password);
      setStatus(status, 'idle', '');
    } catch (err) {
      console.error(err);
      setStatus(status, 'error', 'Generation failed');
    }
  }

  function analyze(password: string, analyze_password: (p: string) => string): void {
    const a = JSON.parse(analyze_password(password)) as PasswordAnalysis;
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
      ? a.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')
      : '';
  }

  hydrateFromUrl();

  function hydrateFromUrl(): void {
    const p = readParams();
    const lenRaw = p.get('length');
    const len = lenRaw != null ? parseInt(lenRaw, 10) : NaN;
    if (Number.isFinite(len) && len >= 8 && len <= 64) {
      lengthInput.value = String(len);
      lengthOut.textContent = lengthInput.value;
    }
    hydrateForm(form, p, HYDRATE_RULES);
  }

  function syncUrl(): void {
    const fd = new FormData(form);
    const updates: Record<string, ParamValue> = { length: fd.get('length') as string | null };
    for (const key of BOOL_KEYS) {
      const flag: BoolKey = key;
      updates[flag] = fd.get(flag) === 'on' ? '1' : '0';
    }
    writeParams(updates);
  }

  lengthInput.addEventListener('input', () => {
    lengthOut.textContent = lengthInput.value;
    syncUrl();
    void regenerate();
  });
  form.addEventListener('change', () => { syncUrl(); void regenerate(); });
  refreshBtn.addEventListener('click', () => { void regenerate(); });

  const shareBtn = root.querySelector<HTMLButtonElement>('[data-share-btn]')!;
  shareBtn.addEventListener('click', () => { syncUrl(); copyShareLink(); });

  function currentEntry(): StorageEntry {
    const value = display.textContent ?? '';
    return { id: makeId(value), value };
  }

  function syncFav(): void {
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

  const panel = root.querySelector<HTMLElement>('[data-pg-history]')!;
  mountHistoryPanel(panel, { tool: TOOL, title: 'Password history' });

  return { regenerate };
}

function template(): string {
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

      <p class="pg-status" data-status data-status-kind="idle" role="status" aria-live="polite"></p>

      <div class="pg-share-row">
        ${shareButtonHtml({ label: 'Share config' })}
        <span class="pg-share-hint">Shares your settings only — never the password.</span>
      </div>

      <div data-ad-slot="pg-leaderboard"></div>

    </form>
    <div data-pg-history></div>
  `;
}

