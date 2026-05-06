import { makeId, pushHistory, type StorageEntry } from '../../lib/storage.js';
import { mountHistoryPanel } from '../../lib/history-panel.js';
import { readParams, writeParams, copyShareLink, randomSeed, shareButtonHtml } from '../../lib/share.js';
import { mountAd } from '../../lib/ads.js';
import { getWasm } from '../../lib/wasm.js';
import { escapeHtml } from '../../lib/dom.js';
import { showToast } from '../../lib/toast.js';

const TOOL = 'gacha-simulator';

interface PullOutcome {
  pull_number: number;
  tier: string;
  pity_count: number;
  soft_pity_active: boolean;
  hard_pity_triggered: boolean;
}

interface TierCount { tier: string; count: number; }

interface PullSummary {
  total_pulls: number;
  by_tier: TierCount[];
  average_pity: number;
}

interface GachaResult {
  pulls: PullOutcome[];
  summary: PullSummary;
  seed: number;
}

const TIER_COLORS: Record<string, string> = {
  '5★': '#FFD700',
  '4★': '#A855F7',
  '3★': '#6B7280',
};

export interface GachaSimulatorHandle { generate: () => Promise<void>; }

export function mountGachaSimulator(root: HTMLElement): GachaSimulatorHandle {
  root.innerHTML = template();

  const modeRadios    = root.querySelectorAll<HTMLInputElement>('[name="mode"]');
  const customPanel   = root.querySelector<HTMLElement>('[data-gs-custom]')!;
  const resultArea    = root.querySelector<HTMLElement>('[data-gs-result]')!;
  const status        = root.querySelector<HTMLElement>('[data-gs-status]')!;
  const historyEl     = root.querySelector<HTMLElement>('[data-gs-history]')!;
  const shareBtn      = root.querySelector<HTMLButtonElement>('[data-share-btn]');
  const tiersContainer= root.querySelector<HTMLElement>('[data-gs-tiers]')!;

  let activeSeed: number | null = null;
  let customTiers = [
    { name: '5★', rate: 6.0,  color: '#FFD700' },
    { name: '4★', rate: 51.0, color: '#A855F7' },
    { name: '3★', rate: 43.0, color: '#6B7280' },
  ];

  // Hydrate from URL
  const params = readParams();
  const urlPreset = params.get('preset');
  if (urlPreset) {
    const r = root.querySelector<HTMLInputElement>(`[name="mode"][value="${urlPreset}"]`);
    if (r) r.checked = true;
  }
  const urlPullCount = params.get('pull_count');
  if (urlPullCount) {
    const b = root.querySelector<HTMLButtonElement>(`[data-gs-count="${urlPullCount}"]`);
    if (b) {
      root.querySelectorAll<HTMLButtonElement>('[data-gs-count]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    }
  }
  const urlSeed = params.get('seed');
  if (urlSeed) activeSeed = parseInt(urlSeed, 10) || null;

  // Mode toggle
  function updateModeVisibility(): void {
    const mode = (root.querySelector<HTMLInputElement>('[name="mode"]:checked'))?.value ?? 'genshin_impact';
    const isCustom = mode === 'custom';
    customPanel.classList.toggle('is-open', isCustom);
    if (shareBtn) shareBtn.style.display = isCustom ? 'none' : '';
  }

  modeRadios.forEach(r => r.addEventListener('change', updateModeVisibility));
  updateModeVisibility();

  // Pull count buttons
  root.querySelectorAll<HTMLButtonElement>('[data-gs-count]').forEach(btn => {
    btn.addEventListener('click', () => {
      root.querySelectorAll<HTMLButtonElement>('[data-gs-count]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Add custom tier
  root.querySelector('[data-gs-add-tier]')?.addEventListener('click', () => {
    customTiers.push({ name: `Tier ${customTiers.length + 1}`, rate: 0.0, color: '#888888' });
    renderCustomTiers();
  });

  function renderCustomTiers(): void {
    tiersContainer.innerHTML = customTiers.map((t, i) => `
      <div class="gs-tier-row">
        <input type="text" class="input input--sm" value="${escapeHtml(t.name)}" data-tier-name="${i}" aria-label="Tier name" />
        <input type="number" class="input input--sm gs-tier-rate" value="${t.rate}" min="0" max="100" step="0.1" data-tier-rate="${i}" aria-label="Rate %" />
        <span class="gs-tier-pct">%</span>
        ${customTiers.length > 1 ? `<button type="button" class="btn btn--ghost btn--icon" data-tier-remove="${i}" aria-label="Remove tier">×</button>` : ''}
      </div>
    `).join('');

    tiersContainer.querySelectorAll<HTMLInputElement>('[data-tier-name]').forEach(inp => {
      inp.addEventListener('input', () => { customTiers[Number(inp.dataset['tierName'])]!.name = inp.value; });
    });
    tiersContainer.querySelectorAll<HTMLInputElement>('[data-tier-rate]').forEach(inp => {
      inp.addEventListener('input', () => { customTiers[Number(inp.dataset['tierRate'])]!.rate = parseFloat(inp.value) || 0; });
    });
    tiersContainer.querySelectorAll<HTMLButtonElement>('[data-tier-remove]').forEach(btn => {
      btn.addEventListener('click', () => { customTiers.splice(Number(btn.dataset['tierRemove']), 1); renderCustomTiers(); });
    });
  }
  renderCustomTiers();

  // Wire pull button
  root.querySelector<HTMLButtonElement>('#gs-pull-btn')?.addEventListener('click', () => {
    activeSeed = null;
    syncUrl();
    void generate();
  });

  function syncUrl(): void {
    const mode = (root.querySelector<HTMLInputElement>('[name="mode"]:checked'))?.value ?? '';
    const count = (root.querySelector<HTMLButtonElement>('[data-gs-count].active'))?.dataset['gsCount'] ?? '10';
    if (mode !== 'custom') {
      writeParams({ preset: mode, pull_count: count, seed: activeSeed ?? null });
    }
  }

  shareBtn?.addEventListener('click', () => {
    if (activeSeed == null) { activeSeed = randomSeed(); void generate(); }
    syncUrl();
    copyShareLink();
  });

  function buildConfig() {
    const mode = (root.querySelector<HTMLInputElement>('[name="mode"]:checked'))?.value ?? 'genshin_impact';
    const count = parseInt((root.querySelector<HTMLButtonElement>('[data-gs-count].active'))?.dataset['gsCount'] ?? '10', 10);
    if (mode === 'custom') {
      return { mode: { kind: 'custom', tiers: customTiers }, pull_count: count, seed: activeSeed ?? null };
    }
    return { mode: { kind: 'preset', preset: mode }, pull_count: count, seed: activeSeed ?? null };
  }

  function tierColor(tier: string): string {
    return TIER_COLORS[tier] ?? '#6B7280';
  }

  function renderResult(result: GachaResult): void {
    const fiveStarCount = result.summary.by_tier.find(t => t.tier === '5★')?.count ?? 0;
    const summaryHtml = `
      <div class="gs-summary">
        <div class="gs-summary__stat"><span class="gs-summary__n">${result.summary.total_pulls}</span><span>Pulls</span></div>
        <div class="gs-summary__stat"><span class="gs-summary__n" style="color:#FFD700">${fiveStarCount}</span><span>5★ Hits</span></div>
        ${result.summary.average_pity > 0 ? `<div class="gs-summary__stat"><span class="gs-summary__n">${result.summary.average_pity.toFixed(1)}</span><span>Avg Pity</span></div>` : ''}
      </div>
    `;

    const pullsHtml = result.pulls.map(p => {
      const cls = p.hard_pity_triggered ? 'gs-pull--hard' : p.soft_pity_active ? 'gs-pull--soft' : '';
      return `<div class="gs-pull ${cls}">
        <span class="gs-pull__n">#${p.pull_number}</span>
        <span class="gs-pull__badge" style="background:${tierColor(p.tier)}22;color:${tierColor(p.tier)};border-color:${tierColor(p.tier)}44">${escapeHtml(p.tier)}</span>
        <span class="gs-pull__pity">pity ${p.pity_count}</span>
        ${p.hard_pity_triggered ? '<span class="gs-pull__tag">HARD PITY</span>' : p.soft_pity_active ? '<span class="gs-pull__tag gs-pull__tag--soft">soft pity</span>' : ''}
      </div>`;
    }).join('');

    const value = `${result.summary.total_pulls} pulls, ${fiveStarCount}× 5★`;
    const entry: StorageEntry = { id: makeId(value + result.seed), value, label: value };
    resultArea.innerHTML = `${summaryHtml}<div class="gs-pulls" data-entry-id="${entry.id}" data-entry-value="${escapeHtml(value)}" data-entry-label="${escapeHtml(value)}">${pullsHtml}</div>`;
    pushHistory(TOOL, entry);
    status.textContent = `${result.summary.total_pulls} pulls completed`;
  }

  async function generate(): Promise<void> {
    try {
      const { generate_gacha } = await getWasm();
      const cfg = buildConfig();
      const json = generate_gacha(JSON.stringify(cfg));
      const result = JSON.parse(json) as GachaResult;
      activeSeed = result.seed;
      syncUrl();
      renderResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      status.textContent = `Error: ${msg}`;
      showToast(`Failed: ${msg}`);
    }
  }

  mountAd(root.querySelector('[data-ad-slot="gs-leaderboard"]'), { format: 'leaderboard' });

  mountHistoryPanel(historyEl, {
    tool: TOOL,
    title: 'Pull history',
    renderValue: (e) => escapeHtml(e.label || e.value),
    copyText: (e) => e.label || e.value,
  });

  return { generate };
}

function template(): string {
  return `
    <div class="gs">
      <div class="gs__controls">
        <fieldset class="cg-field">
          <legend>Game / Mode</legend>
          <div class="segmented">
            <label><input type="radio" name="mode" value="genshin_impact" checked /><span>Genshin</span></label>
            <label><input type="radio" name="mode" value="honkai_star_rail" /><span>HSR</span></label>
            <label><input type="radio" name="mode" value="custom" /><span>Custom</span></label>
          </div>
        </fieldset>

        <fieldset class="cg-field">
          <legend>Pulls</legend>
          <div class="gs-count-group" data-gs-pull-count>
            <button type="button" class="btn btn--ghost btn--sm" data-gs-count="1">×1</button>
            <button type="button" class="btn btn--ghost btn--sm active" data-gs-count="10">×10</button>
            <button type="button" class="btn btn--ghost btn--sm" data-gs-count="100">×100</button>
          </div>
        </fieldset>
      </div>

      <div class="gs__custom" data-gs-custom>
        <div class="gs-custom-inner">
          <p class="gs-custom-hint">Define your tiers (rates must sum to ≤ 100%):</p>
          <div class="gs-tiers" data-gs-tiers></div>
          <button type="button" class="btn btn--ghost btn--sm" data-gs-add-tier>+ Add tier</button>
        </div>
      </div>

      <div class="gs__actions">
        <button type="button" class="btn btn--primary" id="gs-pull-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>
          </svg>
          Pull
        </button>
        ${shareButtonHtml({ label: 'Share' })}
        <span class="gs-status" data-gs-status aria-live="polite"></span>
      </div>

      <div data-ad-slot="gs-leaderboard"></div>

      <div class="gs__result" data-gs-result></div>
    </div>
    <div data-gs-history></div>
  `;
}
