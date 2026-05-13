import { makeId, pushHistory, type StorageEntry } from '../../lib/storage.js';
import { mountHistoryPanel, favoriteButton } from '../../lib/history-panel.js';
import { readParams, writeParams, copyShareLink, randomSeed, shareButtonHtml } from '../../lib/share.js';
import { mountAd } from '../../lib/ads.js';
import { getWasm } from '../../lib/wasm.js';
import { escapeHtml, bindFavoriteDelegation } from '../../lib/dom.js';
import { showToast } from '../../lib/toast.js';

const TOOL = 'game-idea';

interface LockedDimensions {
  genre?: string | null;
  setting?: string | null;
  mechanic?: string | null;
  twist?: string | null;
}

interface GameIdea {
  genre: string;
  setting: string;
  mechanic: string;
  twist: string;
  seed: number;
}

export interface GameIdeaHandle {
  generate: (locked?: LockedDimensions) => Promise<void>;
}

export function mountGameIdea(root: HTMLElement): GameIdeaHandle {
  root.innerHTML = template();

  const ideaCard  = root.querySelector<HTMLElement>('[data-gi-card]')!;
  const historyEl = root.querySelector<HTMLElement>('[data-gi-history]')!;
  const status    = root.querySelector<HTMLElement>('[data-gi-status]')!;

  let currentIdea: GameIdea | null = null;

  // Hydrate seed from URL
  const params = readParams();
  let activeSeed: number | null = null;
  const urlSeed = params.get('seed');
  if (urlSeed) activeSeed = parseInt(urlSeed, 10) || null;

  function syncUrl(): void {
    writeParams({ seed: activeSeed ?? null });
  }

  // Reroll single dimension buttons
  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-gi-reroll]');
    if (!btn || !currentIdea) return;
    const dim = btn.dataset['giReroll'] as keyof LockedDimensions;
    const locked: LockedDimensions = {
      genre:    dim !== 'genre'    ? currentIdea.genre    : null,
      setting:  dim !== 'setting'  ? currentIdea.setting  : null,
      mechanic: dim !== 'mechanic' ? currentIdea.mechanic : null,
      twist:    dim !== 'twist'    ? currentIdea.twist    : null,
    };
    activeSeed = null;
    void generate(locked);
  });

  // Generate all button
  root.querySelector<HTMLButtonElement>('[data-gi-generate]')?.addEventListener('click', () => {
    activeSeed = null;
    syncUrl();
    void generate();
  });

  // Share button
  root.querySelector<HTMLButtonElement>('[data-share-btn]')?.addEventListener('click', () => {
    if (activeSeed == null) { activeSeed = randomSeed(); void generate(); }
    syncUrl();
    void copyShareLink();
  });

  function renderIdea(idea: GameIdea): void {
    currentIdea = idea;

    const dims: Array<{ key: keyof GameIdea & keyof LockedDimensions; label: string }> = [
      { key: 'genre',    label: 'Genre' },
      { key: 'setting',  label: 'Setting' },
      { key: 'mechanic', label: 'Mechanic' },
      { key: 'twist',    label: 'Twist' },
    ];

    const value = `${idea.genre} · ${idea.setting} · ${idea.mechanic} · ${idea.twist}`;
    const entry: StorageEntry = {
      id: makeId(value),
      value,
      label: value,
      meta: { genre: idea.genre, setting: idea.setting, mechanic: idea.mechanic, twist: idea.twist },
    };

    ideaCard.innerHTML = `
      <div class="gi-card" data-entry-id="${entry.id}" data-entry-value="${escapeHtml(value)}" data-entry-label="${escapeHtml(value)}">
        ${dims.map(({ key, label }) => `
          <div class="gi-dim">
            <div class="gi-dim__header">
              <span class="gi-dim__label">${label}</span>
              <button type="button" class="btn btn--ghost btn--icon gi-dim__reroll" data-gi-reroll="${key}" title="Reroll ${label}" aria-label="Reroll ${label}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>
                </svg>
              </button>
            </div>
            <div class="gi-dim__value">${escapeHtml(String(idea[key]))}</div>
          </div>
        `).join('')}
        ${favoriteButton(TOOL, entry)}
      </div>
    `;

    pushHistory(TOOL, entry);
    status.textContent = 'New idea generated';
  }

  bindFavoriteDelegation(
    ideaCard,
    TOOL,
    (el) => ({ id: el.dataset['entryId']!, value: el.dataset['entryValue'] ?? '', label: el.dataset['entryLabel'] ?? '' }),
    (entry) => pushHistory(TOOL, entry),
  );

  async function generate(locked?: LockedDimensions): Promise<void> {
    try {
      const { generate_game_idea } = await getWasm();
      const cfg = {
        seed: activeSeed ?? null,
        locked: locked ?? null,
      };
      const json = generate_game_idea(JSON.stringify(cfg));
      const idea = JSON.parse(json) as GameIdea;
      activeSeed = idea.seed;
      syncUrl();
      renderIdea(idea);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      status.textContent = `Error: ${msg}`;
      showToast(`Failed: ${msg}`);
    }
  }

  mountAd(root.querySelector('[data-ad-slot="gi-leaderboard"]'), { slot: '3355896468', format: 'leaderboard' });

  mountHistoryPanel(historyEl, {
    tool: TOOL,
    title: 'Idea history',
    renderValue: (e) => escapeHtml(e.label || e.value),
    copyText: (e) => e.label || e.value,
  });

  return { generate };
}

function template(): string {
  return `
    <div class="gi">
      <div class="gi__actions">
        <button type="button" class="btn btn--primary" data-gi-generate>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>
          </svg>
          New Idea
        </button>
        ${shareButtonHtml({ label: 'Share' })}
        <span class="gi-status" data-gi-status aria-live="polite"></span>
      </div>

      <div data-ad-slot="gi-leaderboard"></div>

      <div class="gi__card" data-gi-card></div>
    </div>
    <div data-gi-history></div>
  `;
}
