import { showToast } from '../../lib/toast.js';

let wasmGenerate;
let wasmAnalyze;

export function setBackends({ generate, analyze }) {
  wasmGenerate = generate;
  wasmAnalyze = analyze;
}

const STRENGTH_PCT = {
  'very-weak': 15,
  'weak': 30,
  'fair': 55,
  'strong': 80,
  'very-strong': 100,
};

export function mountPasswordGenerator(root) {
  root.innerHTML = template();

  const form = root.querySelector('[data-pg-form]');
  const display = root.querySelector('[data-pg-display]');
  const copyBtn = root.querySelector('[data-pg-copy]');
  const refreshBtn = root.querySelector('[data-pg-refresh]');
  const lengthInput = root.querySelector('[data-pg-length]');
  const lengthOut = root.querySelector('[data-pg-length-out]');
  const meterBar = root.querySelector('[data-pg-meter-bar]');
  const meterLabel = root.querySelector('[data-pg-meter-label]');
  const entropyOut = root.querySelector('[data-pg-entropy]');
  const ttcOut = root.querySelector('[data-pg-ttc]');
  const warningsList = root.querySelector('[data-pg-warnings]');

  function readConfig() {
    const fd = new FormData(form);
    return {
      length: Number(fd.get('length')),
      uppercase: fd.get('uppercase') === 'on',
      lowercase: fd.get('lowercase') === 'on',
      numbers: fd.get('numbers') === 'on',
      symbols: fd.get('symbols') === 'on',
      exclude_ambiguous: fd.get('exclude_ambiguous') === 'on',
      custom_exclude: '',
    };
  }

  function regenerate() {
    if (!wasmGenerate) return;
    const cfg = readConfig();
    if (!cfg.uppercase && !cfg.lowercase && !cfg.numbers && !cfg.symbols) {
      display.textContent = 'Select at least one character set';
      meterBar.style.width = '0%';
      meterBar.dataset.strength = 'very-weak';
      meterLabel.textContent = '—';
      entropyOut.textContent = '0 bits';
      ttcOut.innerHTML = '';
      warningsList.innerHTML = '';
      return;
    }
    try {
      const password = wasmGenerate(JSON.stringify(cfg));
      display.textContent = password;
      analyze(password);
    } catch (err) {
      console.error(err);
      display.textContent = 'Generation failed';
    }
  }

  function analyze(password) {
    if (!wasmAnalyze) return;
    const a = JSON.parse(wasmAnalyze(password));
    const pct = STRENGTH_PCT[a.strength] ?? 0;
    meterBar.style.width = pct + '%';
    meterBar.dataset.strength = a.strength;
    meterLabel.textContent = a.strength_label;
    entropyOut.textContent = `${a.entropy.toFixed(1)} bits`;
    ttcOut.innerHTML = `
      <span><b>Online:</b> ${a.time_to_crack.online_throttled}</span>
      <span><b>Offline (slow):</b> ${a.time_to_crack.offline_slow}</span>
      <span><b>Offline (fast):</b> ${a.time_to_crack.offline_fast}</span>
    `;
    warningsList.innerHTML = a.warnings.length
      ? a.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')
      : '';
  }

  lengthInput.addEventListener('input', () => {
    lengthOut.textContent = lengthInput.value;
    regenerate();
  });
  form.addEventListener('change', regenerate);
  refreshBtn.addEventListener('click', regenerate);

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(display.textContent);
      showToast('Copied');
    } catch {
      showToast('Copy failed');
    }
  });

  return { regenerate };
}

function template() {
  return `
    <form class="pg" data-pg-form>
      <div class="pg-display-row">
        <output class="pg-display" data-pg-display aria-live="polite">…</output>
        <button type="button" class="btn btn--ghost btn--icon" data-pg-refresh aria-label="Regenerate" title="Regenerate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" />
          </svg>
        </button>
        <button type="button" class="btn btn--primary" data-pg-copy>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy
        </button>
      </div>

      <div class="pg-meter">
        <div class="pg-meter__track">
          <div class="pg-meter__bar" data-pg-meter-bar data-strength="very-weak"></div>
        </div>
        <div class="pg-meter__info">
          <span class="pg-meter__label" data-pg-meter-label>—</span>
          <span class="pg-meter__entropy" data-pg-entropy>0 bits</span>
        </div>
        <div class="pg-ttc" data-pg-ttc></div>
        <ul class="pg-warnings" data-pg-warnings></ul>
      </div>

      <div class="pg-controls">
        <div class="pg-field pg-field--full">
          <label for="pg-length">Length: <output data-pg-length-out>16</output></label>
          <input id="pg-length" name="length" type="range" min="8" max="64" value="16" data-pg-length />
        </div>

        <label class="pg-toggle"><input type="checkbox" name="uppercase" checked /><span>Uppercase (A–Z)</span></label>
        <label class="pg-toggle"><input type="checkbox" name="lowercase" checked /><span>Lowercase (a–z)</span></label>
        <label class="pg-toggle"><input type="checkbox" name="numbers" checked /><span>Numbers (0–9)</span></label>
        <label class="pg-toggle"><input type="checkbox" name="symbols" /><span>Symbols (!@#…)</span></label>
        <label class="pg-toggle"><input type="checkbox" name="exclude_ambiguous" /><span>Exclude ambiguous (l, 1, O, 0…)</span></label>
      </div>

    </form>
  `;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
