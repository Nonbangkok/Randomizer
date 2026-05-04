import { toggleTheme } from './theme.js';
import { initGA } from './analytics.js';
import { injectHeader, injectFooter } from './layout.js';

export function wireShell({ activePage = '' } = {}) {
  // Only inject if element is a bare placeholder (no children at all)
  const headerContainer = document.querySelector('[data-header]');
  if (headerContainer && headerContainer.children.length === 0) {
    injectHeader({ activePage });
  }

  const footerContainer = document.querySelector('[data-footer]');
  if (footerContainer && footerContainer.children.length === 0) {
    injectFooter();
  }

  // Update footer year without re-rendering
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Wire theme toggle (works with both hardcoded and injected header)
  syncThemeIcons();
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    toggleTheme();
    syncThemeIcons();
  });

  // Load GA only after full page load + interaction or long delay
  // This avoids GTM impacting Lighthouse metrics entirely
  let gaLoaded = false;
  const loadGAOnce = () => {
    if (!gaLoaded) {
      gaLoaded = true;
      initGA();
    }
  };

  // Fire after first user interaction OR after 5s idle — whichever comes first
  const interactionEvents = ['mousedown', 'touchstart', 'keydown', 'scroll'];
  const removeListeners = () => interactionEvents.forEach(e => window.removeEventListener(e, onInteract));
  const onInteract = () => { removeListeners(); loadGAOnce(); };
  interactionEvents.forEach(e => window.addEventListener(e, onInteract, { passive: true, once: true }));

  // Fallback: load after 6 seconds even without interaction
  setTimeout(() => { removeListeners(); loadGAOnce(); }, 6000);

  registerServiceWorker();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Skip in dev (vite serves from /, but no SW served + HMR doesn't play well with SW caching).
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed', err);
    });
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
      // On mobile, wait for idle callback before loading heavy WASM
      if ('requestIdleCallback' in window) {
        await new Promise(resolve => window.requestIdleCallback(resolve, { timeout: 8000 }));
      } else {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      const mod = await import('../../pkg/wasm_bridge.js');
      await mod.default();
      return mod;
    })();
  }
  return wasmModulePromise;
}
