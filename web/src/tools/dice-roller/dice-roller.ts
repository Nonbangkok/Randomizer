import { showToast } from '../../lib/toast.js';
import { makeId, pushHistory, type StorageEntry } from '../../lib/storage.js';
import { mountHistoryPanel, favoriteButton } from '../../lib/history-panel.js';
import { readParams, writeParams, copyShareLink, randomSeed, shareButtonHtml } from '../../lib/share.js';
import { mountAd } from '../../lib/ads.js';
import { getWasm } from '../../lib/wasm.js';
import { escapeHtml, bindFavoriteDelegation } from '../../lib/dom.js';

const TOOL = 'dice-roller';

interface RollGroup {
  die_size: number;
  rolls: number[];
  kept: boolean[];
  subtotal: number;
}

interface DiceResult {
  groups: RollGroup[];
  modifier: number;
  total: number;
  expression: string;
  seed: number;
}

export interface DiceRollerHandle {
  generate: () => Promise<void>;
}

const PRESETS = [
  { label: 'd4',           expr: 'd4' },
  { label: 'd6',           expr: 'd6' },
  { label: 'd8',           expr: 'd8' },
  { label: 'd10',          expr: 'd10' },
  { label: 'd12',          expr: 'd12' },
  { label: 'd20',          expr: 'd20' },
  { label: 'd100',         expr: 'd100' },
  { label: '2d6',          expr: '2d6' },
  { label: '4d6 drop low', expr: '4d6kh3' },
];

export function mountDiceRoller(root: HTMLElement): DiceRollerHandle {
  root.innerHTML = template();

  const exprInput  = root.querySelector<HTMLInputElement>('[data-dr-expr]')!;
  const rollBtn    = root.querySelector<HTMLButtonElement>('[data-dr-roll]')!;
  const resultArea = root.querySelector<HTMLDivElement>('[data-dr-result]')!;
  const status     = root.querySelector<HTMLElement>('[data-dr-status]')!;
  const historyEl  = root.querySelector<HTMLElement>('[data-dr-history]')!;

  let activeSeed: number | null = null;

  // Hydrate expression from URL
  const params = readParams();
  const urlExpr = params.get('expression');
  if (urlExpr) exprInput.value = urlExpr;
  const urlSeed = params.get('seed');
  if (urlSeed) activeSeed = parseInt(urlSeed, 10) || null;

  function syncUrl(): void {
    writeParams({ expression: exprInput.value || null, seed: activeSeed ?? null });
  }

  // Preset buttons
  root.querySelectorAll<HTMLButtonElement>('[data-dr-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      exprInput.value = btn.dataset['drPreset'] ?? '';
      activeSeed = null;
      syncUrl();
      void generate();
    });
  });

  // Expression input change
  exprInput.addEventListener('change', () => { activeSeed = null; syncUrl(); });

  // Roll button
  rollBtn.addEventListener('click', () => { activeSeed = null; syncUrl(); void generate(); });

  // Share button
  root.querySelector<HTMLButtonElement>('[data-share-btn]')?.addEventListener('click', () => {
    if (activeSeed == null) { activeSeed = randomSeed(); void generate(); }
    syncUrl();
    void copyShareLink();
  });

  function renderResult(result: DiceResult): void {
    const group = result.groups[0];
    if (!group) return;

    const diceHtml = group.rolls.map((v, i) => {
      const kept = group.kept[i] ?? true;
      return `<span class="dr-die ${kept ? 'dr-die--kept' : 'dr-die--dropped'}" title="d${group.die_size}">${v}</span>`;
    }).join('');

    const modHtml = result.modifier !== 0
      ? `<span class="dr-modifier">${result.modifier > 0 ? '+' : ''}${result.modifier}</span>`
      : '';

    const value = `${result.expression} = ${result.total}`;
    const entry: StorageEntry = { id: makeId(value + result.seed), value, label: value, meta: { expr: result.expression, total: result.total } };

    resultArea.innerHTML = `
      <div class="dr-result-card" data-entry-id="${entry.id}" data-entry-value="${escapeHtml(value)}" data-entry-label="${escapeHtml(value)}">
        <div class="dr-expr-label">${escapeHtml(result.expression)}</div>
        <div class="dr-dice-row">${diceHtml}${modHtml}</div>
        <div class="dr-total">${result.total}</div>
        ${favoriteButton(TOOL, entry)}
      </div>
    `;

    pushHistory(TOOL, entry);
    status.textContent = `Rolled ${result.expression} → ${result.total}`;
  }

  bindFavoriteDelegation(
    resultArea,
    TOOL,
    (el) => ({
      id: el.dataset['entryId']!,
      value: el.dataset['entryValue'] ?? '',
      label: el.dataset['entryLabel'] ?? '',
    }),
    (entry) => pushHistory(TOOL, entry),
  );

  async function generate(): Promise<void> {
    const expr = exprInput.value.trim() || 'd20';
    try {
      const { generate_dice } = await getWasm();
      const json = generate_dice(JSON.stringify({ expression: expr, seed: activeSeed ?? null }));
      const result = JSON.parse(json) as DiceResult;
      activeSeed = result.seed;
      syncUrl();
      renderResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      status.textContent = `Error: ${msg}`;
      showToast(`Invalid expression: ${msg}`);
    }
  }

  mountAd(root.querySelector('[data-ad-slot="dr-leaderboard"]'), { format: 'leaderboard' });

  mountHistoryPanel(historyEl, {
    tool: TOOL,
    title: 'Roll history',
    renderValue: (e) => escapeHtml(e.label || e.value),
    copyText: (e) => e.label || e.value,
  });

  return { generate };
}

function template(): string {
  const presetBtns = PRESETS.map((p) =>
    `<button type="button" class="btn btn--ghost btn--sm" data-dr-preset="${escapeHtml(p.expr)}">${escapeHtml(p.label)}</button>`
  ).join('');

  return `
    <div class="dr">
      <div class="dr__presets">${presetBtns}</div>

      <div class="dr__input-row">
        <input
          type="text"
          class="input dr__expr-input"
          placeholder="e.g. 2d6+3, 4d6kh3, d20"
          data-dr-expr
          aria-label="Dice expression"
          spellcheck="false"
          autocomplete="off"
        />
        <button type="button" class="btn btn--primary" data-dr-roll>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="4"/>
            <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/>
            <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/>
            <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/>
            <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.2" fill="currentColor"/>
          </svg>
          Roll
        </button>
        ${shareButtonHtml({ label: 'Share' })}
      </div>

      <span class="dr-status" data-dr-status aria-live="polite"></span>

      <div data-ad-slot="dr-leaderboard"></div>

      <div class="dr__result" data-dr-result></div>
    </div>
    <div data-dr-history></div>
  `;
}
