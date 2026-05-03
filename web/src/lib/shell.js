import { toggleTheme } from './theme.js';
import { initGA } from './analytics.js';

export function wireShell() {
  // Defer GA initialization to reduce TBT
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => initGA());
  } else {
    setTimeout(initGA, 2000);
  }
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
    wasmModulePromise = (async () => {
      // Small delay to let browser finish critical tasks
      if ('requestIdleCallback' in window) {
        await new Promise(resolve => window.requestIdleCallback(resolve));
      }
      const mod = await import('../../pkg/wasm_bridge.js');
      await mod.default();
      return mod;
    })();
  }
  return wasmModulePromise;
}
