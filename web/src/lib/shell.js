import { toggleTheme } from './theme.js';
import { initGA } from './analytics.js';

export function wireShell() {
  initGA();
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  syncThemeIcons();
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    toggleTheme();
    syncThemeIcons();
  });
}

function syncThemeIcons() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const light = document.querySelector('[data-theme-icon="light"]');
  const dark = document.querySelector('[data-theme-icon="dark"]');
  if (light && dark) {
    light.style.display = isDark ? 'none' : '';
    dark.style.display = isDark ? '' : 'none';
  }
}

let wasmModulePromise;
export function loadWasm() {
  if (!wasmModulePromise) {
    wasmModulePromise = import('../../pkg/wasm_bridge.js').then(async (mod) => {
      await mod.default();
      return mod;
    });
  }
  return wasmModulePromise;
}
