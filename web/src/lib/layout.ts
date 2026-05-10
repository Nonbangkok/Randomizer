// Site-wide header + footer. Each page's HTML ships with `<div data-header>`
// and `<div data-footer>` placeholders; `mountHeader` / `mountFooter` swap
// those slots with the actual `<header>` / `<footer>` elements and return them
// so callers can wire additional behaviour (e.g. nav-link prefetch).

interface NavItem {
  key: string;
  href: string;
  label: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { key: 'names', href: '/tools/name-generator/', label: 'Names' },
  { key: 'passwords', href: '/tools/password-generator/', label: 'Passwords' },
  { key: 'backlog', href: '/tools/backlog-wheel/', label: 'Backlog' },
  { key: 'challenges', href: '/tools/challenge-generator/', label: 'Challenges' },
  { key: 'dice', href: '/tools/dice-roller/', label: 'Dice' },
  { key: 'gacha', href: '/tools/gacha-simulator/', label: 'Gacha' },
  { key: 'game-idea', href: '/tools/game-idea/', label: 'Game Idea' },
  { key: 'drop', href: '/tools/drop-point/', label: 'Drop Point' },
  { key: 'decision', href: '/tools/decision-maker/', label: 'Decision Maker' },
  { key: 'blog', href: '/blog/', label: 'Blog' },
];

const BRAND_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8" cy="8" r="1.25" fill="currentColor" /><circle cx="16" cy="8" r="1.25" fill="currentColor" /><circle cx="8" cy="16" r="1.25" fill="currentColor" /><circle cx="16" cy="16" r="1.25" fill="currentColor" /><circle cx="12" cy="12" r="1.25" fill="currentColor" /></svg>`;

const THEME_TOGGLE = `<button id="theme-toggle" class="btn btn--ghost btn--icon" type="button" aria-label="Toggle color theme" title="Toggle theme"><svg data-theme-icon="light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg><svg data-theme-icon="dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18" style="display:none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg></button>`;

export interface MountHeaderOptions {
  activePage?: string;
}

function buildHeader({ activePage = '' }: MountHeaderOptions): HTMLElement {
  const links = NAV_ITEMS.map((item) => {
    const current = item.key === activePage ? ' aria-current="page"' : '';
    return `<a href="${item.href}"${current}>${item.label}</a>`;
  }).join('');
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<header class="site-header"><div class="site-header__inner"><a href="/" class="site-header__brand" aria-label="Randomizer home">${BRAND_SVG}<span>Randomizer</span></a><nav class="site-nav" aria-label="Primary">${links}</nav><div class="site-header__actions">${THEME_TOGGLE}</div></div></header>`;
  return wrapper.firstElementChild as HTMLElement;
}

/**
 * Replace the `<div data-header>` slot with the rendered `<header>` element
 * and return it. Returns null if the slot isn't present (legacy pages with
 * a hand-coded header).
 */
export function mountHeader(opts: MountHeaderOptions = {}): HTMLElement | null {
  const slot = document.querySelector('[data-header]');
  if (!slot) return null;
  const header = buildHeader(opts);
  slot.replaceWith(header);
  return header;
}

const BMC_URL = 'https://www.buymeacoffee.com/nonbangkok';

const COFFEE_BUTTON = `<a class="bmc" href="${BMC_URL}" target="_blank" rel="noopener noreferrer" aria-label="Support Randomizer on Buy Me a Coffee"><span class="bmc__cup" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M17 8h1a4 4 0 0 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" /></svg><span class="bmc__steam"></span><span class="bmc__steam"></span><span class="bmc__steam"></span></span><span class="bmc__label">Buy me a coffee</span></a>`;

function buildFooter(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<footer class="site-footer"><div class="site-footer__inner"><span class="site-footer__lead">🔒 All processing happens in your browser.</span>${COFFEE_BUTTON}<div class="site-footer__links"><a href="/privacy-policy.html">Privacy Policy</a><a href="/terms.html">Terms of Service</a><a href="/contact.html">Contact Us</a><span>© <span id="footer-year"></span> Randomizer</span></div></div></footer>`;
  return wrapper.firstElementChild as HTMLElement;
}

export function mountFooter(): HTMLElement | null {
  const slot = document.querySelector('[data-footer]');
  if (!slot) return null;
  const footer = buildFooter();
  slot.replaceWith(footer);
  return footer;
}
