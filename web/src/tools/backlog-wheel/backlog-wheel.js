import { showToast } from '../../lib/toast.js';

const STORAGE_KEY = 'randomizer:backlog';

export function mountBacklogWheel(root) {
  root.innerHTML = template();

  const textarea = root.querySelector('[data-bw-input]');
  const spinBtn = root.querySelector('[data-bw-spin]');
  const result = root.querySelector('[data-bw-result]');
  const count = root.querySelector('[data-bw-count]');

  textarea.value = load();
  updateCount();

  textarea.addEventListener('input', () => {
    save(textarea.value);
    updateCount();
  });

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

    try { await navigator.clipboard.writeText(target); showToast('Copied to clipboard'); } catch {}

    spinning = false;
    spinBtn.disabled = list.length < 2;
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
        <span class="bw-count" data-bw-count>—</span>
      </div>
      <label class="bw-field">
        <span>Your list (one per line)</span>
        <textarea class="input bw-textarea" rows="8" data-bw-input placeholder="Game 1&#10;Game 2&#10;Game 3"></textarea>
      </label>
      <p class="bw-hint">Saved locally to your browser. Press the button to pick one at random.</p>
    </div>
  `;
}
