import { showToast } from '../../lib/toast.js';
import { makeId, pushHistory, type StorageEntry } from '../../lib/storage.js';
import { mountHistoryPanel, favoriteButton } from '../../lib/history-panel.js';
import { readParams, writeParams, copyShareLink, shareButtonHtml } from '../../lib/share.js';
import { getWasm } from '../../lib/wasm.js';
import { escapeHtml, hydrateForm, bindFavoriteDelegation, type HydrateRule } from '../../lib/dom.js';

const TOOL = 'decision-maker';
const SHARE_KEYS = ['mode', 'options', 'seed'] as const;

const HYDRATE_RULES: readonly HydrateRule[] = [
  { kind: 'radio', name: 'mode' },
  { kind: 'text', name: 'options' },
  { kind: 'text', name: 'seed' },
];

interface DecisionConfig {
  options: string[];
  weights: number[] | null;
  seed: number | null;
}

interface DecisionResult {
  choice: string;
  index: number;
  seed: number;
}

export interface DecisionMakerHandle {
  generate: () => Promise<void>;
}

export function mountDecisionMaker(root: HTMLElement): DecisionMakerHandle {
  root.innerHTML = template();

  const form = root.querySelector<HTMLFormElement>('[data-dm-form]')!;
  const resultDisplay = root.querySelector<HTMLDivElement>('[data-dm-result]')!;
  const modeRadios = root.querySelectorAll<HTMLInputElement>('input[name="mode"]');
  const customSection = root.querySelector<HTMLElement>('[data-dm-custom-section]')!;
  const status = root.querySelector<HTMLElement>('[data-dm-status]')!;

  function syncModeVisibility(): void {
    const mode = Array.from(modeRadios).find(r => r.checked)?.value;
    customSection.hidden = mode !== 'custom';
  }

  modeRadios.forEach(r => r.addEventListener('change', syncModeVisibility));
  syncModeVisibility();

  hydrateFromUrl();
  syncModeVisibility();

  function hydrateFromUrl(): void {
    const p = readParams();
    hydrateForm(form, p, HYDRATE_RULES);
  }

  function syncUrl(): void {
    const fd = new FormData(form);
    const mode = fd.get('mode') as string;
    writeParams({
      mode,
      options: mode === 'custom' ? fd.get('options') as string : null,
      seed: fd.get('seed') as string | null,
    });
  }

  function readConfig(): DecisionConfig {
    const fd = new FormData(form);
    const mode = fd.get('mode') as string;
    let options: string[] = ['Yes', 'No'];
    
    if (mode === 'custom') {
      const raw = fd.get('options') as string;
      options = raw.split('\n').map(s => s.trim()).filter(Boolean);
      if (options.length === 0) options = ['?'];
    }

    const rawSeed = fd.get('seed') as string;
    const seed = rawSeed ? hashSeed(rawSeed) : null;

    return { options, weights: null, seed };
  }

  async function generate(): Promise<void> {
    try {
      const { generate_decision } = await getWasm();
      const cfg = readConfig();
      const json = generate_decision(JSON.stringify(cfg));
      const res = JSON.parse(json) as DecisionResult;
      
      render(res);
      status.textContent = `Decided: ${res.choice}`;
    } catch (err) {
      console.error(err);
      status.textContent = 'Decision failed.';
    }
  }

  function render(res: DecisionResult): void {
    const entry: StorageEntry = { id: makeId(res.choice), value: res.choice };
    resultDisplay.innerHTML = `
      <div class="dm-result-card" data-entry-id="${entry.id}" data-entry-value="${escapeHtml(res.choice)}">
        <div class="dm-result-label">Result</div>
        <div class="dm-result-value">${escapeHtml(res.choice)}</div>
        <div class="dm-result-actions">
          ${favoriteButton(TOOL, entry)}
          <button class="btn btn--ghost btn--icon" data-copy="${escapeHtml(res.choice)}" title="Copy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  resultDisplay.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement | null;
    const copyBtn = target?.closest('[data-copy]');
    if (copyBtn) {
      const val = (copyBtn as HTMLElement).dataset.copy ?? '';
      await navigator.clipboard.writeText(val);
      showToast('Copied');
    }
  });

  bindFavoriteDelegation(
    resultDisplay,
    TOOL,
    (card) => ({ id: card.dataset.entryId!, value: card.dataset.entryValue ?? '' }),
    (entry) => pushHistory(TOOL, entry),
  );

  form.addEventListener('submit', (e) => { e.preventDefault(); void generate(); });
  form.addEventListener('change', () => { syncUrl(); void generate(); });

  const shareBtn = root.querySelector<HTMLButtonElement>('[data-share-btn]')!;
  shareBtn.addEventListener('click', () => { syncUrl(); copyShareLink(); });

  const historyEl = root.querySelector<HTMLElement>('[data-dm-history]')!;
  mountHistoryPanel(historyEl, { tool: TOOL, title: 'Decision history' });

  return { generate };
}

function template(): string {
  return `
    <form class="dm" data-dm-form>
      <div class="dm__mode">
        <fieldset class="ng-field">
          <legend>Mode</legend>
          <div class="segmented">
            <label><input type="radio" name="mode" value="yesno" checked /><span>Yes / No</span></label>
            <label><input type="radio" name="mode" value="custom" /><span>Custom</span></label>
          </div>
        </fieldset>
      </div>

      <div class="dm__custom" data-dm-custom-section hidden>
        <div class="ng-field">
          <label for="dm-options">Choices (one per line)</label>
          <textarea id="dm-options" name="options" class="input" rows="5" placeholder="Pizza\nSushi\nTacos" data-dm-options></textarea>
        </div>
      </div>

      <div class="ng-field">
        <label for="dm-seed">Seed (Optional)</label>
        <input id="dm-seed" name="seed" type="text" class="input" placeholder="e.g. lunch-decider" />
      </div>

      <div class="dm__actions">
        <button type="submit" class="btn btn--primary dm-generate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
            <path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" />
          </svg>
          Decide
        </button>
        ${shareButtonHtml({ label: 'Share' })}
        <span class="dm-status" data-dm-status aria-live="polite"></span>
      </div>

      <div class="dm-result" data-dm-result></div>
    </form>
    <div data-dm-history></div>
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
