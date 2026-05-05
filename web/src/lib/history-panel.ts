// Reusable Recent/Favorites panel mounted below a tool's results.
// Subscribes to storage changes for live updates.

import {
  getHistory,
  getFavorites,
  toggleFavorite,
  removeFavorite,
  clearHistory,
  subscribe,
  isFavorite,
  type StorageEntry,
} from './storage.js';
import { showToast } from './toast.js';
import { escapeHtml } from './dom.js';

export interface HistoryPanelOptions {
  tool: string;
  title?: string;
  renderValue?: (entry: StorageEntry) => string;
  copyText?: (entry: StorageEntry) => string;
  onUse?: ((entry: StorageEntry) => void) | null;
}

export interface HistoryPanelHandle {
  destroy: () => void;
}

type Tab = 'recent' | 'favorites';

export function mountHistoryPanel(root: HTMLElement, opts: HistoryPanelOptions): HistoryPanelHandle {
  const {
    tool,
    title = 'History',
    renderValue = (e) => escapeHtml(e.label || e.value),
    copyText = (e) => e.value,
    onUse = null,
  } = opts;

  root.classList.add('history-panel');
  root.innerHTML = shell(title, !!onUse);

  const tabs = root.querySelectorAll<HTMLButtonElement>('[data-hp-tab]');
  const list = root.querySelector<HTMLUListElement>('[data-hp-list]')!;
  const empty = root.querySelector<HTMLParagraphElement>('[data-hp-empty]')!;
  const clearBtn = root.querySelector<HTMLButtonElement>('[data-hp-clear]')!;
  let activeTab: Tab = 'recent';

  function entries(): StorageEntry[] {
    return activeTab === 'recent' ? getHistory(tool) : getFavorites(tool);
  }

  function render(): void {
    const items = entries();
    clearBtn.hidden = activeTab !== 'recent' || items.length === 0;
    if (!items.length) {
      list.innerHTML = '';
      empty.hidden = false;
      empty.textContent =
        activeTab === 'recent'
          ? 'Nothing yet. Generate something to start your history.'
          : 'No favorites yet. Tap the heart on any result to save it.';
      return;
    }
    empty.hidden = true;
    list.innerHTML = items
      .map((e) => {
        const fav = isFavorite(tool, e.id);
        return `
        <li class="hp-item" data-hp-id="${escapeAttr(e.id)}">
          <div class="hp-item__value">${renderValue(e)}</div>
          <div class="hp-item__actions">
            ${
              onUse
                ? `<button type="button" class="btn btn--ghost btn--sm" data-hp-use aria-label="Use this entry" title="Use">${iconUse()}</button>`
                : ''
            }
            <button type="button" class="btn btn--ghost btn--icon" data-hp-copy aria-label="Copy" title="Copy">${iconCopy()}</button>
            <button type="button" class="btn btn--ghost btn--icon hp-fav ${fav ? 'is-on' : ''}" data-hp-fav aria-pressed="${fav}" aria-label="${fav ? 'Remove favorite' : 'Add favorite'}" title="${fav ? 'Unfavorite' : 'Favorite'}">${iconHeart(fav)}</button>
            ${
              activeTab === 'favorites'
                ? `<button type="button" class="btn btn--ghost btn--icon" data-hp-remove aria-label="Remove" title="Remove">${iconX()}</button>`
                : ''
            }
          </div>
        </li>`;
      })
      .join('');
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const next = tab.dataset.hpTab;
      if (next !== 'recent' && next !== 'favorites') return;
      activeTab = next;
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
      });
      render();
    });
  });

  list.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement | null;
    const li = target?.closest<HTMLLIElement>('[data-hp-id]');
    if (!li) return;
    const id = li.dataset.hpId!;
    const entry = entries().find((x) => x.id === id);
    if (!entry) return;

    if (target?.closest('[data-hp-copy]')) {
      try {
        await navigator.clipboard.writeText(copyText(entry));
        showToast('Copied');
      } catch {
        showToast('Copy failed');
      }
    } else if (target?.closest('[data-hp-fav]')) {
      toggleFavorite(tool, entry);
    } else if (target?.closest('[data-hp-remove]')) {
      removeFavorite(tool, id);
    } else if (onUse && target?.closest('[data-hp-use]')) {
      onUse(entry);
    }
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('Clear all recent history?')) clearHistory(tool);
  });

  const unsubscribe = subscribe(tool, render);
  render();

  return { destroy: unsubscribe };
}

function shell(title: string, hasUse: boolean): string {
  void hasUse;
  return `
    <header class="hp-header">
      <h2 class="hp-title">${escapeHtml(title)}</h2>
      <div class="hp-tabs" role="tablist">
        <button type="button" class="hp-tab is-active" data-hp-tab="recent" role="tab" aria-selected="true">Recent</button>
        <button type="button" class="hp-tab" data-hp-tab="favorites" role="tab" aria-selected="false">★ Favorites</button>
      </div>
      <button type="button" class="btn btn--ghost btn--sm hp-clear" data-hp-clear hidden>Clear</button>
    </header>
    <ul class="hp-list" data-hp-list></ul>
    <p class="hp-empty" data-hp-empty hidden></p>
  `;
}

function iconCopy(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>`;
}
function iconHeart(filled: boolean): string {
  return `<svg viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
}
function iconX(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
}
function iconUse(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
}

// Exported helper so tools can render an inline heart on result cards consistently.
export function favoriteButton(tool: string, entry: StorageEntry): string {
  const fav = isFavorite(tool, entry.id);
  return `<button type="button" class="btn btn--ghost btn--icon hp-fav ${fav ? 'is-on' : ''}" data-fav-id="${escapeAttr(entry.id)}" aria-pressed="${fav}" aria-label="${fav ? 'Remove favorite' : 'Add favorite'}" title="${fav ? 'Unfavorite' : 'Favorite'}">${iconHeart(fav)}</button>`;
}

function escapeAttr(s: unknown): string {
  return escapeHtml(s);
}
