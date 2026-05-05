export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'randomizer:theme';

export function getStoredTheme(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function resolveInitialTheme(): Theme {
  const stored = getStoredTheme();
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* quota / private mode */ }
}

export function toggleTheme(): Theme {
  const next: Theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}
