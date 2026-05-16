import '../design-system/index.css';
import { wireShell } from '../lib/shell.js';
import { mountAd } from '../lib/ads.js';
import { getRecent, clearRecent } from '../lib/recent-tools.js';

wireShell({ activePage: 'home' });

// Add ad after lead paragraph
const lead = document.querySelector('.lead');
if (lead) {
  const adSlot = document.createElement('div');
  lead.after(adSlot);
  mountAd(adSlot, { slot: '3355896468', format: 'leaderboard' });
}

const cards = Array.from(document.querySelectorAll<HTMLAnchorElement>('.tool-card[data-key]'));

// Stagger entrance animation via the existing [style*="--i"] rule in components.css.
cards.forEach((card, i) => {
  card.style.setProperty('--i', String(i));
});

// --- Recently used rail ----------------------------------------------------
const recentSection = document.querySelector<HTMLElement>('[data-recent-section]');
const recentRail = document.querySelector<HTMLElement>('[data-recent-rail]');
const recentClear = document.querySelector<HTMLButtonElement>('[data-recent-clear]');

function renderRecent(): void {
  if (!recentSection || !recentRail) return;
  const recent = getRecent();
  if (recent.length === 0) {
    recentSection.hidden = true;
    recentRail.replaceChildren();
    return;
  }
  const cardsByKey = new Map(cards.map((c) => [c.dataset.key ?? '', c]));
  const frag = document.createDocumentFragment();
  let rendered = 0;
  for (const entry of recent) {
    const source = cardsByKey.get(entry.key);
    if (!source) continue;
    const chip = document.createElement('a');
    chip.href = source.href;
    chip.className = 'recent-chip';
    chip.style.setProperty('--i', String(rendered));
    const iconText = source.querySelector('.tool-card__icon')?.textContent ?? '✨';
    const titleText = source.querySelector('h2')?.textContent ?? entry.key;
    chip.innerHTML = `<span class="recent-chip__icon" aria-hidden="true">${iconText}</span><span class="recent-chip__label">${titleText}</span>`;
    frag.appendChild(chip);
    rendered++;
  }
  if (rendered === 0) {
    recentSection.hidden = true;
    recentRail.replaceChildren();
    return;
  }
  recentRail.replaceChildren(frag);
  recentSection.hidden = false;
}

recentClear?.addEventListener('click', () => {
  clearRecent();
  renderRecent();
});

renderRecent();

// --- Search / filter -------------------------------------------------------
const searchInput = document.querySelector<HTMLInputElement>('[data-tool-search]');
const emptyState = document.querySelector<HTMLElement>('[data-tool-search-empty]');

function applyFilter(query: string): void {
  const q = query.trim().toLowerCase();
  let visible = 0;
  for (const card of cards) {
    if (!q) {
      card.hidden = false;
      visible++;
      continue;
    }
    const haystack = `${card.dataset.search ?? ''} ${card.textContent ?? ''}`.toLowerCase();
    const match = haystack.includes(q);
    card.hidden = !match;
    if (match) visible++;
  }
  if (emptyState) emptyState.hidden = visible !== 0;
}

searchInput?.addEventListener('input', () => {
  applyFilter(searchInput.value);
});

// Press `/` anywhere on the page to jump to the search box (skip when already typing).
window.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return;
  }
  if (!searchInput) return;
  e.preventDefault();
  searchInput.focus();
  searchInput.select();
});

