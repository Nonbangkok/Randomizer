import { showToast } from '../../lib/toast.js';
import { makeId, pushHistory, type StorageEntry } from '../../lib/storage.js';
import { mountHistoryPanel, favoriteButton } from '../../lib/history-panel.js';
import { readParams, writeParams, copyShareLink, shareButtonHtml } from '../../lib/share.js';
import { mountAd } from '../../lib/ads.js';
import { getWasm } from '../../lib/wasm.js';
import { escapeHtml, hydrateForm, bindFavoriteDelegation, type HydrateRule } from '../../lib/dom.js';

const TOOL = 'name-generator';
const SHARE_KEYS = ['genre', 'language', 'method', 'seed', 'descriptor'] as const;

const HYDRATE_RULES: readonly HydrateRule[] = [
  { kind: 'radio', name: 'genre' },
  { kind: 'radio', name: 'language' },
  { kind: 'select', name: 'method' },
  { kind: 'text', name: 'seed' },
  { kind: 'checkbox', name: 'descriptor' },
];

type NameGenMethod = 'combinatorial' | 'syllable' | 'hybrid';

interface NameGenConfig {
  genre: string;
  language: string;
  method: NameGenMethod;
  count: number;
  seed: number | null;
  min_length: number;
  max_length: number;
  include_descriptor: boolean;
}

export interface NameGeneratorHandle {
  generate: () => Promise<void>;
}

export function mountNameGenerator(root: HTMLElement): NameGeneratorHandle {
  root.innerHTML = template();

  const form = root.querySelector<HTMLFormElement>('[data-ng-form]')!;
  const grid = root.querySelector<HTMLDivElement>('[data-ng-results]')!;
  const seedInput = root.querySelector<HTMLInputElement>('[data-ng-seed]')!;
  const seedRow = root.querySelector<HTMLElement>('[data-ng-seed-row]')!;
  const methodSelect = root.querySelector<HTMLSelectElement>('[data-ng-method]')!;
  const status = root.querySelector<HTMLElement>('[data-ng-status]')!;
  const advToggle = root.querySelector<HTMLButtonElement>('[data-ng-adv-toggle]')!;
  const advPanel = root.querySelector<HTMLElement>('[data-ng-adv-panel]')!;
  const advChevron = advToggle.querySelector<HTMLElement>('.ng-adv__chevron')!;

  /* --- Advanced panel toggle --- */
  let advOpen = false;
  function setAdvOpen(open: boolean): void {
    advOpen = open;
    advPanel.classList.toggle('is-open', advOpen);
    advToggle.setAttribute('aria-expanded', String(advOpen));
    advChevron.style.transform = advOpen ? 'rotate(180deg)' : '';
  }
  advToggle.addEventListener('click', () => setAdvOpen(!advOpen));

  /* --- Seed row visibility --- */
  function syncSeedVisibility(): void {
    seedRow.hidden = methodSelect.value !== 'seeded';
  }
  methodSelect.addEventListener('change', syncSeedVisibility);
  syncSeedVisibility();

  hydrateFromUrl();
  syncSeedVisibility();

  /* If URL had advanced params, auto-open the panel */
  const initialParams = readParams();
  if (initialParams.get('method') || initialParams.get('seed') || initialParams.get('descriptor')) {
    setAdvOpen(true);
  }

  function hydrateFromUrl(): void {
    const p = readParams();
    if (!SHARE_KEYS.some((k) => p.has(k))) return;
    hydrateForm(form, p, HYDRATE_RULES);
  }

  function syncUrl(): void {
    const fd = new FormData(form);
    writeParams({
      genre: fd.get('genre') as string | null,
      language: fd.get('language') as string | null,
      method: fd.get('method') as string | null,
      seed: fd.get('method') === 'seeded' ? ((fd.get('seed') as string | null) || '') : null,
      descriptor: fd.get('descriptor') === 'on' ? '1' : null,
    });
  }

  function readConfig(): NameGenConfig {
    const fd = new FormData(form);
    const methodValue = fd.get('method');
    let method: NameGenMethod = 'combinatorial';
    let seed: number | null = null;
    if (methodValue === 'syllable') method = 'syllable';
    else if (methodValue === 'hybrid') method = 'hybrid';
    else if (methodValue === 'seeded') {
      method = 'hybrid';
      const raw = fd.get('seed');
      const trimmed = typeof raw === 'string' ? raw.trim() : '';
      seed = trimmed ? hashSeed(trimmed) : 1;
    }
    return {
      genre: String(fd.get('genre') ?? ''),
      language: String(fd.get('language') ?? ''),
      method,
      count: 8,
      seed,
      min_length: 4,
      max_length: 24,
      include_descriptor: fd.get('descriptor') === 'on',
    };
  }

  function render(names: string[]): void {
    if (!names.length) {
      grid.innerHTML = `<p class="ng-empty">No names generated. Try different settings.</p>`;
      return;
    }
    grid.innerHTML = names.map((n, i) => {
      const entry: StorageEntry = { id: makeId(n), value: n };
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
    const target = e.target as HTMLElement | null;
    const card = target?.closest<HTMLElement>('[data-entry-id]');
    if (!card || !target?.closest('[data-copy]')) return;
    const value = card.dataset.entryValue ?? '';
    try {
      await navigator.clipboard.writeText(value);
      pushHistory(TOOL, { id: card.dataset.entryId!, value });
      showToast('Copied');
    } catch {
      showToast('Copy failed');
    }
  });

  bindFavoriteDelegation(
    grid,
    TOOL,
    (card) => ({ id: card.dataset.entryId!, value: card.dataset.entryValue ?? '' }),
    (entry) => pushHistory(TOOL, entry),
  );

  async function generate(): Promise<void> {
    try {
      const { generate_names } = await getWasm();
      const cfg = readConfig();
      const json = generate_names(JSON.stringify(cfg));
      const names = JSON.parse(json) as string[];
      render(names);
      status.textContent = `${names.length} names generated`;
    } catch (err) {
      console.error(err);
      status.textContent = 'Generation failed.';
    }
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); void generate(); });
  form.addEventListener('change', () => { syncUrl(); if (grid.children.length) void generate(); });
  form.addEventListener('input', (e) => { if (e.target === seedInput) syncUrl(); });

  const shareBtn = root.querySelector<HTMLButtonElement>('[data-share-btn]')!;
  shareBtn.addEventListener('click', () => { syncUrl(); copyShareLink(); });

  mountAd(root.querySelector('[data-ad-slot="ng-leaderboard"]'), { slot: '3355896468', format: 'leaderboard' });

  const panel = root.querySelector<HTMLElement>('[data-ng-history]')!;
  mountHistoryPanel(panel, { tool: TOOL, title: 'Names history' });

  return { generate };
}

function template(): string {
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

function hashSeed(input: string): number {
  let h = 2166136261n;
  for (const ch of input) {
    h ^= BigInt(ch.codePointAt(0)!);
    h = (h * 16777619n) & 0xffffffffffffffffn;
  }
  return Number(h & 0x1fffffffffffffn);
}
