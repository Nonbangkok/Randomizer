// Page-level keyboard shortcut registry. Replaces the per-page `keydown`
// blocks that every tool used to duplicate. Handlers run only when focus
// isn't inside an editable element so users can still type in inputs.

type ShortcutHandler = (e: KeyboardEvent) => void;

interface Binding {
  match: (e: KeyboardEvent) => boolean;
  handler: ShortcutHandler;
}

const bindings: Binding[] = [];
let installed = false;

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.matches !== 'function') return false;
  return el.matches('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
}

function onKeyDown(e: KeyboardEvent): void {
  if (isEditableTarget(e.target)) return;
  for (const b of bindings) {
    if (b.match(e)) {
      e.preventDefault();
      b.handler(e);
      return;
    }
  }
}

function ensureInstalled(): void {
  if (installed) return;
  document.addEventListener('keydown', onKeyDown);
  installed = true;
}

/**
 * Register a shortcut. `key` matches `KeyboardEvent.code` (e.g. `'Space'`,
 * `'Enter'`, `'KeyG'`). Returns an unregister function.
 *
 * Convenience: pass `'Primary'` to bind both Space and Enter — the canonical
 * "trigger this tool's main action" combo every generator already wanted.
 */
export function registerShortcut(key: string, handler: ShortcutHandler): () => void {
  ensureInstalled();
  const match: Binding['match'] =
    key === 'Primary'
      ? (e) => e.code === 'Space' || e.key === 'Enter'
      : (e) => e.code === key || e.key === key;
  const binding: Binding = { match, handler };
  bindings.push(binding);
  return () => {
    const i = bindings.indexOf(binding);
    if (i >= 0) bindings.splice(i, 1);
  };
}
