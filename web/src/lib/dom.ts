// DOM + form helpers shared across tools. The escape utilities used to be
// duplicated in every tool module; the form setters / hydrateForm replace
// the per-tool `hydrateFromUrl` loops with a small declarative schema.

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(s: unknown): string {
  return String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

// Minimal CSS attribute-value sanitiser used when interpolating user-supplied
// strings into `input[name="x"][value="<here>"]` selectors. Strips anything
// outside `[A-Za-z0-9_-]` so a hostile param can't break out of the selector.
export function cssEscape(s: unknown): string {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '');
}

/** Sets the matching radio button in a `name=` group. Returns true on hit. */
export function setRadio(form: HTMLFormElement, name: string, value: string): boolean {
  const radio = form.querySelector<HTMLInputElement>(
    `input[name="${name}"][value="${cssEscape(value)}"]`,
  );
  if (!radio) return false;
  radio.checked = true;
  return true;
}

/** Sets a `<select name=...>` value if the option exists. Returns true on hit. */
export function setSelect(form: HTMLFormElement, name: string, value: string): boolean {
  const select = form.querySelector<HTMLSelectElement>(`select[name="${name}"]`);
  if (!select) return false;
  if (![...select.options].some((o) => o.value === value)) return false;
  select.value = value;
  return true;
}

/** Sets a `<input type=checkbox name=...>` to the given checked state. */
export function setCheckbox(form: HTMLFormElement, name: string, checked: boolean): boolean {
  const cb = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!cb) return false;
  cb.checked = checked;
  return true;
}

/** Sets a free-form text/range/etc. input by `name`. */
export function setInputValue(form: HTMLFormElement, name: string, value: string): boolean {
  const el = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!el) return false;
  el.value = value;
  return true;
}

import { toggleFavorite, type StorageEntry } from './storage.js';

/**
 * Delegated click handler for favorite buttons (`[data-fav-id]`) inside a
 * result grid/list. The caller supplies a `getEntry(itemEl)` function that
 * extracts the StorageEntry from the closest result element — typically by
 * reading `data-entry-*` attributes set during render.
 *
 * Pairs with `favoriteButton(tool, entry)` from `history-panel.ts`.
 */
export function bindFavoriteDelegation(
  root: HTMLElement,
  tool: string,
  getEntry: (item: HTMLElement) => StorageEntry | null,
  onFavorited?: (entry: StorageEntry) => void,
): void {
  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const favBtn = target?.closest<HTMLButtonElement>('[data-fav-id]');
    if (!favBtn) return;
    const item = favBtn.closest<HTMLElement>('[data-entry-id]');
    if (!item) return;
    const entry = getEntry(item);
    if (!entry) return;
    const nowFav = toggleFavorite(tool, entry);
    favBtn.classList.toggle('is-on', nowFav);
    favBtn.setAttribute('aria-pressed', String(nowFav));
    favBtn.querySelector('svg')?.setAttribute('fill', nowFav ? 'currentColor' : 'none');
    if (nowFav) onFavorited?.(entry);
  });
}

export type StatusKind = 'idle' | 'busy' | 'error' | 'success';

/**
 * Set a unified status message + kind on a `[data-status]` line. Tools that
 * use this convention get consistent styling (via `[data-status-kind]`
 * attribute selectors in CSS) and a single place to look for current state.
 */
export function setStatus(el: HTMLElement | null, kind: StatusKind, message: string): void {
  if (!el) return;
  el.dataset.statusKind = kind;
  el.textContent = message;
}

export type HydrateRule =
  | { kind: 'radio'; name: string; param?: string }
  | { kind: 'select'; name: string; param?: string }
  | { kind: 'text'; name: string; param?: string; validate?: (raw: string) => boolean }
  | { kind: 'checkbox'; name: string; param?: string; truthy?: readonly string[] };

/**
 * Hydrate form fields from a URLSearchParams object using a declarative schema.
 * - Skips silently when a param is absent.
 * - For `select`, only sets the value if the option exists (no schema config needed).
 * - For `checkbox`, the param value is matched against `truthy` (default `['1','on','true']`).
 *
 * Returns the count of fields that were actually updated — useful when you
 * want to know whether anything was hydrated (e.g. to auto-open an advanced panel).
 */
export function hydrateForm(
  form: HTMLFormElement,
  params: URLSearchParams,
  rules: readonly HydrateRule[],
): number {
  let hits = 0;
  for (const r of rules) {
    const v = params.get(r.param ?? r.name);
    if (v == null) continue;
    switch (r.kind) {
      case 'radio':
        if (setRadio(form, r.name, v)) hits++;
        break;
      case 'select':
        if (setSelect(form, r.name, v)) hits++;
        break;
      case 'text':
        if (r.validate && !r.validate(v)) break;
        if (setInputValue(form, r.name, v)) hits++;
        break;
      case 'checkbox': {
        const truthy = r.truthy ?? ['1', 'on', 'true'];
        if (setCheckbox(form, r.name, truthy.includes(v))) hits++;
        break;
      }
    }
  }
  return hits;
}
