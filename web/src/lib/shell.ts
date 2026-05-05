import { toggleTheme } from './theme.js';
import { initGA } from './analytics.js';
import { mountHeader, mountFooter } from './layout.js';
import { prefetchAll } from './prefetch.js';

export interface WireShellOptions {
  activePage?: string;
}

export function wireShell({ activePage = '' }: WireShellOptions = {}): void {
  const header = mountHeader({ activePage });
  if (header) {
    // Prefetch tool + blog destinations on hover so the next-page navigation
    // feels instant. Self-link (the active page) is harmless to prefetch.
    prefetchAll(header.querySelectorAll<HTMLAnchorElement>('nav a[href]'));
  }
  mountFooter();

  // Update footer year without re-rendering
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Wire theme toggle (works with both hardcoded and injected header)
  syncThemeIcons();
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    toggleTheme();
    syncThemeIcons();
  });

  // Load GA only after full page load + interaction or long delay so GTM doesn't
  // hurt Lighthouse metrics.
  let gaLoaded = false;
  const loadGAOnce = (): void => {
    if (!gaLoaded) {
      gaLoaded = true;
      initGA();
    }
  };

  const interactionEvents = ['mousedown', 'touchstart', 'keydown', 'scroll'] as const;
  const removeListeners = (): void => interactionEvents.forEach((e) => window.removeEventListener(e, onInteract));
  const onInteract = (): void => { removeListeners(); loadGAOnce(); };
  interactionEvents.forEach((e) => window.addEventListener(e, onInteract, { passive: true, once: true }));

  // Fallback: load after 6 seconds even without interaction
  setTimeout(() => { removeListeners(); loadGAOnce(); }, 6000);

  registerServiceWorker();
}

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  // Skip in dev (Vite serves from /, but no SW served + HMR doesn't play well with SW caching).
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed', err);
    });
  });
}

function syncThemeIcons(): void {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const light = document.querySelector<HTMLElement>('[data-theme-icon="light"]');
  const dark = document.querySelector<HTMLElement>('[data-theme-icon="dark"]');
  if (light && dark) {
    light.style.display = isDark ? 'none' : '';
    dark.style.display = isDark ? '' : 'none';
  }
}

