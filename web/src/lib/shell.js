import { toggleTheme } from './theme.js';
import { initGA } from './analytics.js';
import { injectHeader, injectFooter } from './layout.js';

export function wireShell({ activePage = '' } = {}) {
  // Inject layout components only if placeholders exist and are empty
  const headerContainer = document.querySelector('[data-header]');
  if (headerContainer && !headerContainer.innerHTML.trim()) {
    injectHeader({ activePage });
  }
  
  const footerContainer = document.querySelector('[data-footer]');
  if (footerContainer && !footerContainer.innerHTML.trim()) {
    injectFooter();
  }

  // Defer non-critical tasks even more for mobile
  const delay = window.innerWidth < 768 ? 3000 : 1000;
  
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => initGA(), { timeout: 5000 });
  } else {
    setTimeout(initGA, delay);
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
      // Longer delay for mobile to let UI become stable
      const idleDelay = window.innerWidth < 768 ? 2000 : 0;
      if (idleDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, idleDelay));
      }
      
      if ('requestIdleCallback' in window) {
        await new Promise(resolve => window.requestIdleCallback(resolve, { timeout: 10000 }));
      }
      const mod = await import('../../pkg/wasm_bridge.js');
      await mod.default();
      return mod;
    })();
  }
  return wasmModulePromise;
}
