import { showToast } from '../../lib/toast.js';
import { makeId, pushHistory, toggleFavorite } from '../../lib/storage.js';
import { mountHistoryPanel, favoriteButton } from '../../lib/history-panel.js';
import { readParams, writeParams, copyShareLink, encodeText, decodeText, shareButtonHtml } from '../../lib/share.js';
import { mountAd } from '../../lib/ads.js';

const TOOL = 'backlog-wheel';
const STORAGE_KEY = 'randomizer:backlog';
const URL_LIST_LIMIT = 6000; // skip URL sync past this length to keep URLs sane

export function mountBacklogWheel(root) {
  root.innerHTML = template();

  const textarea = root.querySelector('[data-bw-input]');
  const spinBtn = root.querySelector('[data-bw-spin]');
  const result = root.querySelector('[data-bw-result]');
  const count = root.querySelector('[data-bw-count]');
  const favSlot = root.querySelector('[data-bw-fav-slot]');

  // URL list takes precedence over local storage when present.
  const urlList = decodeText(readParams().get('list'));
  textarea.value = urlList || load();
  updateCount();
  if (urlList) save(textarea.value);

  textarea.addEventListener('input', () => {
    save(textarea.value);
    syncUrl();
    updateCount();
  });

  function syncUrl() {
    const text = textarea.value.trim();
    const encoded = encodeText(text);
    if (encoded.length > URL_LIST_LIMIT) {
      writeParams({ list: null });
    } else {
      writeParams({ list: encoded || null });
    }
  }

  function items() {
    return textarea.value.split('\n').map(s => s.trim()).filter(Boolean);
  }
  function updateCount() {
    const n = items().length;
    count.textContent = n === 0 ? 'Add items to spin' : `${n} item${n === 1 ? '' : 's'}`;
    spinBtn.disabled = n < 2;
  }

  let spinning = false;
  spinBtn.addEventListener('click', async () => {
    if (spinning) return;
    const list = items();
    if (list.length < 2) return;

    spinning = true;
    spinBtn.disabled = true;
    result.classList.add('is-spinning');

    const target = list[Math.floor(Math.random() * list.length)];
    const totalMs = 1600;
    const start = performance.now();
    let last = '';

    await new Promise((resolve) => {
      function tick(now) {
        const t = (now - start) / totalMs;
        if (t >= 1) { resolve(); return; }
        const delay = 40 + t * t * 200;
        const pick = list[Math.floor(Math.random() * list.length)];
        if (pick !== last) {
          result.textContent = pick;
          last = pick;
        }
        setTimeout(() => requestAnimationFrame(tick), delay);
      }
      requestAnimationFrame(tick);
    });

    result.textContent = target;
    result.classList.remove('is-spinning');
    result.classList.add('is-revealed');
    setTimeout(() => result.classList.remove('is-revealed'), 600);

    const entry = { id: makeId(target), value: target };
    pushHistory(TOOL, entry);
    favSlot.innerHTML = favoriteButton(TOOL, entry);

    try { await navigator.clipboard.writeText(target); showToast('Copied to clipboard'); } catch {}

    spinning = false;
    spinBtn.disabled = list.length < 2;
  });

  favSlot.addEventListener('click', (e) => {
    const favBtn = e.target.closest('[data-fav-id]');
    if (!favBtn) return;
    const value = result.textContent;
    if (!value || value === '—') return;
    const entry = { id: makeId(value), value };
    const nowFav = toggleFavorite(TOOL, entry);
    if (nowFav) pushHistory(TOOL, entry);
    favBtn.classList.toggle('is-on', nowFav);
    favBtn.setAttribute('aria-pressed', String(nowFav));
    favBtn.querySelector('svg')?.setAttribute('fill', nowFav ? 'currentColor' : 'none');
  });

  const shareBtn = root.querySelector('[data-share-btn]');
  shareBtn.addEventListener('click', () => {
    syncUrl();
    const encoded = encodeText(textarea.value.trim());
    if (encoded.length > URL_LIST_LIMIT) {
      showToast('List too long to share via URL');
      return;
    }
    copyShareLink();
  });

  // Reflect initial state into the URL when hydrated from URL (no-op otherwise).
  if (urlList) syncUrl();

  mountAd(root.querySelector('[data-ad-slot="bw-leaderboard"]'), { format: 'leaderboard' });

  const panel = root.querySelector('[data-bw-history]');
  mountHistoryPanel(panel, {
    tool: TOOL,
    title: 'Spin history',
    onUse: (entry) => {
      result.textContent = entry.value;
      favSlot.innerHTML = favoriteButton(TOOL, entry);
    },
  });

  return {};
}

function load() {
  try { return localStorage.getItem(STORAGE_KEY) || defaultList(); } catch { return defaultList(); }
}
function save(v) { try { localStorage.setItem(STORAGE_KEY, v); } catch {} }
function defaultList() {
  return ['Elden Ring', 'Hollow Knight', 'Stardew Valley', 'Hades', 'Disco Elysium'].join('\n');
}

function template() {
  return `
    <div class="bw">
      <div class="bw-result" data-bw-result>—</div>
      <div class="bw-actions">
        <button type="button" class="btn btn--primary bw-spin" data-bw-spin>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" />
          </svg>
          Spin
        </button>
        <span class="bw-fav-slot" data-bw-fav-slot></span>
        ${shareButtonHtml({ label: 'Share list' })}
        <span class="bw-count" data-bw-count>—</span>
      </div>
      <label class="bw-field">
        <span>Your list (one per line)</span>
        <textarea class="input bw-textarea" rows="8" data-bw-input placeholder="Game 1&#10;Game 2&#10;Game 3"></textarea>
      </label>
      <p class="bw-hint">Saved locally to your browser. Press the button to pick one at random.</p>
      <div data-ad-slot="bw-leaderboard"></div>
      <div data-bw-history></div>
    </div>
  `;
}
