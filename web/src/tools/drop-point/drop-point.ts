import { makeId, pushHistory, type StorageEntry } from '../../lib/storage.js';
import { mountHistoryPanel, favoriteButton } from '../../lib/history-panel.js';
import { readParams, writeParams, copyShareLink, randomSeed, shareButtonHtml } from '../../lib/share.js';
import { mountAd } from '../../lib/ads.js';
import { getWasm } from '../../lib/wasm.js';
import { escapeHtml, hydrateForm, bindFavoriteDelegation, type HydrateRule } from '../../lib/dom.js';
import { showToast } from '../../lib/toast.js';

const TOOL = 'drop-point';

const HYDRATE_RULES: readonly HydrateRule[] = [
  { kind: 'radio', name: 'game' },
  { kind: 'text',  name: 'player_count' },
];

interface DropPointResult {
  locations: string[];
  seed: number;
}

export interface DropPointHandle {
  generate: () => Promise<void>;
}

export function mountDropPoint(root: HTMLElement): DropPointHandle {
  root.innerHTML = template();

  const form       = root.querySelector<HTMLFormElement>('[data-dp-form]')!;
  const resultArea = root.querySelector<HTMLDivElement>('[data-dp-result]')!;
  const status     = root.querySelector<HTMLElement>('[data-dp-status]')!;
  const historyEl  = root.querySelector<HTMLElement>('[data-dp-history]')!;

  let activeSeed: number | null = null;

  // Hydrate from URL
  const params = readParams();
  hydrateForm(form, params, HYDRATE_RULES);
  const urlSeed = params.get('seed');
  if (urlSeed) activeSeed = parseInt(urlSeed, 10) || null;

  function readConfig() {
    const fd = new FormData(form);
    return {
      game: String(fd.get('game') ?? 'universal'),
      player_count: Math.min(4, Math.max(1, Number(fd.get('player_count')) || 1)),
      seed: activeSeed,
    };
  }

  function syncUrl(): void {
    const fd = new FormData(form);
    writeParams({
      game: fd.get('game') as string | null,
      player_count: fd.get('player_count') as string | null,
      seed: activeSeed ?? null,
    });
  }

  form.addEventListener('change', () => { activeSeed = null; syncUrl(); void generate(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); activeSeed = null; syncUrl(); void generate(); });

  root.querySelector<HTMLButtonElement>('[data-share-btn]')?.addEventListener('click', () => {
    if (activeSeed == null) { activeSeed = randomSeed(); void generate(); }
    syncUrl();
    void copyShareLink();
  });

  function renderResult(result: DropPointResult): void {
    const value = result.locations.join(' / ');
    const entry: StorageEntry = {
      id: makeId(value + result.seed),
      value,
      label: value,
      meta: { locations: result.locations },
    };

    resultArea.innerHTML = `
      <div class="dp-result" data-entry-id="${entry.id}" data-entry-value="${escapeHtml(value)}" data-entry-label="${escapeHtml(value)}">
        ${result.locations.map((loc, i) => `
          <div class="dp-location" style="--i:${i}">
            ${result.locations.length > 1 ? `<span class="dp-player">Player ${i + 1}</span>` : ''}
            <span class="dp-loc-name">${escapeHtml(loc)}</span>
          </div>
        `).join('')}
        ${favoriteButton(TOOL, entry)}
      </div>
    `;

    pushHistory(TOOL, entry);
    status.textContent = `${result.locations.length === 1 ? 'Drop at' : 'Dropping at'}: ${value}`;
  }

  bindFavoriteDelegation(
    resultArea,
    TOOL,
    (el) => ({ id: el.dataset['entryId']!, value: el.dataset['entryValue'] ?? '', label: el.dataset['entryLabel'] ?? '' }),
    (entry) => pushHistory(TOOL, entry),
  );

  async function generate(): Promise<void> {
    try {
      const { generate_drop_point } = await getWasm();
      const cfg = readConfig();
      const json = generate_drop_point(JSON.stringify(cfg));
      const result = JSON.parse(json) as DropPointResult;
      activeSeed = result.seed;
      syncUrl();
      renderResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      status.textContent = `Error: ${msg}`;
      showToast(`Failed: ${msg}`);
    }
  }

  mountAd(root.querySelector('[data-ad-slot="dp-leaderboard"]'), { slot: '3355896468', format: 'leaderboard' });

  mountHistoryPanel(historyEl, {
    tool: TOOL,
    title: 'Drop history',
    renderValue: (e) => escapeHtml(e.label || e.value),
    copyText: (e) => e.label || e.value,
  });

  return { generate };
}

function template(): string {
  return `
    <form class="dp" data-dp-form>
      <div class="dp__controls">
        <fieldset class="cg-field">
          <legend>Game</legend>
          <div class="segmented">
            <label><input type="radio" name="game" value="universal" checked /><span>Universal</span></label>
            <label><input type="radio" name="game" value="apex_legends" /><span>Apex</span></label>
            <label><input type="radio" name="game" value="fortnite" /><span>Fortnite</span></label>
            <label><input type="radio" name="game" value="warzone" /><span>Warzone</span></label>
          </div>
        </fieldset>

        <div class="cg-field">
          <label for="dp-players">Squad size</label>
          <input type="number" id="dp-players" name="player_count" class="input dp__squad-input" value="1" min="1" max="4" />
        </div>
      </div>

      <div class="dp__actions">
        <button type="submit" class="btn btn--primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>
          </svg>
          Pick Drop Point
        </button>
        ${shareButtonHtml({ label: 'Share' })}
        <span class="dp-status" data-dp-status aria-live="polite"></span>
      </div>

      <div data-ad-slot="dp-leaderboard"></div>

      <div class="dp__result" data-dp-result></div>
    </form>
    <div data-dp-history></div>
  `;
}
