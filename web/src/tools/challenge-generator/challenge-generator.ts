import { showToast } from '../../lib/toast.js';
import { makeId, pushHistory, type StorageEntry } from '../../lib/storage.js';
import { mountHistoryPanel, favoriteButton } from '../../lib/history-panel.js';
import { readParams, writeParams, copyShareLink, randomSeed, shareButtonHtml } from '../../lib/share.js';
import { mountAd } from '../../lib/ads.js';
import { getWasm } from '../../lib/wasm.js';
import { escapeHtml, hydrateForm, bindFavoriteDelegation, type HydrateRule } from '../../lib/dom.js';

const TOOL = 'challenge-generator';

const HYDRATE_RULES: readonly HydrateRule[] = [
  { kind: 'radio', name: 'game' },
  { kind: 'radio', name: 'difficulty' },
  { kind: 'select', name: 'count' },
];

interface ChallengeRule {
  category: string;
  text: string;
}

interface ChallengeConfig {
  game: string;
  difficulty: string;
  count: number;
  seed: number | null;
}

export interface ChallengeGeneratorHandle {
  generate: () => Promise<void>;
}

export function mountChallengeGenerator(root: HTMLElement): ChallengeGeneratorHandle {
  root.innerHTML = template();

  const form = root.querySelector<HTMLFormElement>('[data-cg-form]')!;
  const list = root.querySelector<HTMLOListElement>('[data-cg-list]')!;
  const status = root.querySelector<HTMLElement>('[data-cg-status]')!;

  let activeSeed: number | null = null;

  function readConfig(): ChallengeConfig {
    const fd = new FormData(form);
    return {
      game: String(fd.get('game') ?? ''),
      difficulty: String(fd.get('difficulty') ?? ''),
      count: Number(fd.get('count')) || 5,
      seed: activeSeed,
    };
  }

  function hydrateFromUrl(): void {
    const p = readParams();
    hydrateForm(form, p, HYDRATE_RULES);
    const seedRaw = p.get('seed');
    const seed = seedRaw != null ? parseInt(seedRaw, 10) : NaN;
    if (Number.isFinite(seed) && seed >= 0) activeSeed = seed;
  }

  function syncUrl(): void {
    const fd = new FormData(form);
    writeParams({
      game: fd.get('game') as string | null,
      difficulty: fd.get('difficulty') as string | null,
      count: fd.get('count') as string | null,
      seed: activeSeed ?? null,
    });
  }

  hydrateFromUrl();

  function render(rules: ChallengeRule[]): void {
    if (!rules.length) {
      list.innerHTML = `<p class="cg-empty">No rules generated.</p>`;
      return;
    }
    list.innerHTML = rules.map((r, i) => {
      const value = `[${r.category}] ${r.text}`;
      const entry: StorageEntry = {
        id: makeId(value),
        value,
        label: r.text,
        meta: { category: r.category },
      };
      return `
      <li class="cg-rule" style="--i:${i}" data-entry-id="${entry.id}" data-entry-value="${escapeHtml(value)}" data-entry-label="${escapeHtml(r.text)}" data-entry-category="${escapeHtml(r.category)}">
        <span class="badge">${escapeHtml(r.category)}</span>
        <span class="cg-rule__text">${escapeHtml(r.text)}</span>
        ${favoriteButton(TOOL, entry)}
      </li>
    `;
    }).join('');
  }

  bindFavoriteDelegation(
    list,
    TOOL,
    (li) => ({
      id: li.dataset.entryId!,
      value: li.dataset.entryValue ?? '',
      label: li.dataset.entryLabel ?? '',
      meta: { category: li.dataset.entryCategory ?? '' },
    }),
    (entry) => pushHistory(TOOL, entry),
  );

  async function generate(): Promise<void> {
    try {
      const { generate_challenge } = await getWasm();
      const json = generate_challenge(JSON.stringify(readConfig()));
      const rules = JSON.parse(json) as ChallengeRule[];
      render(rules);
      status.textContent = `${rules.length} rule${rules.length === 1 ? '' : 's'} generated`;
    } catch (err) {
      console.error(err);
      status.textContent = 'Generation failed.';
    }
  }

  // User-driven config changes invalidate the locked seed (otherwise stale).
  form.addEventListener('change', () => { activeSeed = null; syncUrl(); if (list.children.length) void generate(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); activeSeed = null; syncUrl(); void generate(); });

  const shareBtn = root.querySelector<HTMLButtonElement>('[data-share-btn]')!;
  shareBtn.addEventListener('click', () => {
    if (activeSeed == null) {
      activeSeed = randomSeed();
      void generate();
    }
    syncUrl();
    copyShareLink();
  });

  const copyAllBtn = root.querySelector<HTMLButtonElement>('[data-cg-copy]')!;
  copyAllBtn.addEventListener('click', async () => {
    const text = Array.from(list.querySelectorAll<HTMLElement>('.cg-rule__text'))
      .map((el, i) => `${i + 1}. ${el.textContent ?? ''}`)
      .join('\n');
    if (!text) return;
    try { await navigator.clipboard.writeText(text); showToast('Copied'); } catch { showToast('Copy failed'); }
  });

  mountAd(root.querySelector('[data-ad-slot="cg-leaderboard"]'), { slot: '3355896468', format: 'leaderboard' });

  const panel = root.querySelector<HTMLElement>('[data-cg-history]')!;
  mountHistoryPanel(panel, {
    tool: TOOL,
    title: 'Challenge history',
    renderValue: (e) => {
      const category = typeof e.meta?.['category'] === 'string' ? (e.meta['category'] as string) : '—';
      return `<span class="badge">${escapeHtml(category)}</span> ${escapeHtml(e.label || e.value)}`;
    },
    copyText: (e) => e.label || e.value,
  });

  return { generate };
}

function template(): string {
  return `
    <form class="cg" data-cg-form>
      <div class="cg__controls">
        <fieldset class="cg-field">
          <legend>Game</legend>
          <div class="segmented">
            <label><input type="radio" name="game" value="universal" checked /><span>Universal</span></label>
            <label><input type="radio" name="game" value="pokemon" /><span>Pokémon</span></label>
            <label><input type="radio" name="game" value="elden-ring" /><span>Elden Ring</span></label>
          </div>
        </fieldset>

        <fieldset class="cg-field">
          <legend>Difficulty</legend>
          <div class="segmented">
            <label><input type="radio" name="difficulty" value="easy" /><span>Easy</span></label>
            <label><input type="radio" name="difficulty" value="medium" checked /><span>Medium</span></label>
            <label><input type="radio" name="difficulty" value="hardcore" /><span>Hardcore</span></label>
          </div>
        </fieldset>

        <div class="cg-field">
          <label for="cg-count">Rule count</label>
          <select id="cg-count" name="count" class="input">
            <option value="3">3</option>
            <option value="5" selected>5</option>
            <option value="7">7</option>
            <option value="10">10</option>
          </select>
        </div>
      </div>

      <div class="cg__actions">
        <button type="submit" class="btn btn--primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" />
          </svg>
          Generate
        </button>
        <button type="button" class="btn btn--ghost" data-cg-copy>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy all
        </button>
        ${shareButtonHtml({ label: 'Share' })}
        <span class="cg-status" data-cg-status aria-live="polite"></span>
      </div>

      <div data-ad-slot="cg-leaderboard"></div>

      <ol class="cg-list" data-cg-list></ol>
    </form>
    <div data-cg-history></div>
  `;
}

