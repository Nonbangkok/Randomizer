import { showToast } from '../../lib/toast.js';
import { makeId, pushHistory, toggleFavorite } from '../../lib/storage.js';
import { mountHistoryPanel, favoriteButton } from '../../lib/history-panel.js';
import { readParams, writeParams, copyShareLink, randomSeed, shareButtonHtml } from '../../lib/share.js';
import { mountAd } from '../../lib/ads.js';

const TOOL = 'challenge-generator';
let wasmGenerate;
export function setGenerator(fn) { wasmGenerate = fn; }

export function mountChallengeGenerator(root) {
  root.innerHTML = template();

  const form = root.querySelector('[data-cg-form]');
  const list = root.querySelector('[data-cg-list]');
  const status = root.querySelector('[data-cg-status]');

  let activeSeed = null;

  function readConfig() {
    const fd = new FormData(form);
    return {
      game: fd.get('game'),
      difficulty: fd.get('difficulty'),
      count: Number(fd.get('count')) || 5,
      seed: activeSeed,
    };
  }

  function hydrateFromUrl() {
    const p = readParams();
    for (const name of ['game', 'difficulty']) {
      const v = p.get(name);
      if (v) {
        const radio = form.querySelector(`input[name="${name}"][value="${cssEscape(v)}"]`);
        if (radio) radio.checked = true;
      }
    }
    const count = p.get('count');
    if (count && form.querySelector(`option[value="${cssEscape(count)}"]`)) {
      form.querySelector('select[name="count"]').value = count;
    }
    const seed = parseInt(p.get('seed'), 10);
    if (Number.isFinite(seed) && seed > 0) activeSeed = seed;
  }

  function syncUrl() {
    const fd = new FormData(form);
    writeParams({
      game: fd.get('game'),
      difficulty: fd.get('difficulty'),
      count: fd.get('count'),
      seed: activeSeed || null,
    });
  }

  hydrateFromUrl();

  function render(rules) {
    if (!rules.length) {
      list.innerHTML = `<p class="cg-empty">No rules generated.</p>`;
      return;
    }
    list.innerHTML = rules.map((r, i) => {
      const value = `[${r.category}] ${r.text}`;
      const entry = { id: makeId(value), value, label: r.text, meta: { category: r.category } };
      return `
      <li class="cg-rule" style="--i:${i}" data-entry-id="${entry.id}" data-entry-value="${escapeHtml(value)}" data-entry-label="${escapeHtml(r.text)}" data-entry-category="${escapeHtml(r.category)}">
        <span class="badge">${escapeHtml(r.category)}</span>
        <span class="cg-rule__text">${escapeHtml(r.text)}</span>
        ${favoriteButton(TOOL, entry)}
      </li>
    `;
    }).join('');
  }

  list.addEventListener('click', (e) => {
    const favBtn = e.target.closest('[data-fav-id]');
    if (!favBtn) return;
    const li = favBtn.closest('[data-entry-id]');
    if (!li) return;
    const entry = {
      id: li.dataset.entryId,
      value: li.dataset.entryValue,
      label: li.dataset.entryLabel,
      meta: { category: li.dataset.entryCategory },
    };
    const nowFav = toggleFavorite(TOOL, entry);
    if (nowFav) pushHistory(TOOL, entry);
    favBtn.classList.toggle('is-on', nowFav);
    favBtn.setAttribute('aria-pressed', String(nowFav));
    favBtn.querySelector('svg')?.setAttribute('fill', nowFav ? 'currentColor' : 'none');
  });

  function generate() {
    if (!wasmGenerate) return;
    try {
      const json = wasmGenerate(JSON.stringify(readConfig()));
      const rules = JSON.parse(json);
      render(rules);
      status.textContent = `${rules.length} rule${rules.length === 1 ? '' : 's'} generated`;
    } catch (err) {
      console.error(err);
      status.textContent = 'Generation failed.';
    }
  }

  // User-driven config changes invalidate the locked seed (otherwise stale).
  form.addEventListener('change', () => { activeSeed = null; syncUrl(); if (list.children.length) generate(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); activeSeed = null; syncUrl(); generate(); });

  const shareBtn = root.querySelector('[data-share-btn]');
  shareBtn.addEventListener('click', () => {
    if (activeSeed == null) {
      activeSeed = randomSeed();
      generate();
    }
    syncUrl();
    copyShareLink();
  });

  const copyAllBtn = root.querySelector('[data-cg-copy]');
  copyAllBtn.addEventListener('click', async () => {
    const text = Array.from(list.querySelectorAll('.cg-rule__text'))
      .map((el, i) => `${i + 1}. ${el.textContent}`)
      .join('\n');
    if (!text) return;
    try { await navigator.clipboard.writeText(text); showToast('Copied'); } catch { showToast('Copy failed'); }
  });

  mountAd(root.querySelector('[data-ad-slot="cg-leaderboard"]'), { format: 'leaderboard' });

  const panel = root.querySelector('[data-cg-history]');
  mountHistoryPanel(panel, {
    tool: TOOL,
    title: 'Challenge history',
    renderValue: (e) => `<span class="badge">${escapeHtml(e.meta?.category || '—')}</span> ${escapeHtml(e.label || e.value)}`,
    copyText: (e) => e.label || e.value,
  });

  return { generate };
}

function template() {
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

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function cssEscape(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '');
}
