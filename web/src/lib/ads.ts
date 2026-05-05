// Ad slot scaffolding. Always reserves layout space via CSS to keep CLS = 0.
// Renders a labeled placeholder until ADSENSE_CLIENT is set; swap to real ads
// by filling in the constants below and calling loadAdSenseScript() once per page.

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const IS_DEV =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// TODO: fill these in once your AdSense account is approved.
const ADSENSE_CLIENT = 'ca-pub-2544127529898767'; // e.g. 'ca-pub-XXXXXXXXXXXXXXXX'

export type AdFormat = 'leaderboard' | 'rectangle' | 'mobile';

const FORMAT_LABELS: Record<AdFormat, string> = {
  leaderboard: 'Horizontal leaderboard',
  rectangle: 'Medium rectangle',
  mobile: 'Mobile banner',
};

export interface MountAdOptions {
  format?: AdFormat;
  slot?: string;
  label?: string;
}

export function mountAd(
  el: Element | null,
  { format = 'leaderboard', slot = '', label = 'Advertisement' }: MountAdOptions = {},
): void {
  if (!el) return;
  el.classList.add('ad-container', `ad-container--${format}`);
  el.setAttribute('role', 'complementary');
  el.setAttribute('aria-label', label);

  // No real ads yet — render a labeled placeholder. Layout space is reserved
  // by .ad-container's min-height so swapping in the real <ins> later is CLS-free.
  if (IS_DEV || !ADSENSE_CLIENT || !slot) {
    el.innerHTML = `
      <div class="ad-placeholder">
        <span class="ad-placeholder__label">${label}</span>
        <span class="ad-placeholder__format">${FORMAT_LABELS[format] ?? format}</span>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <ins class="adsbygoogle" style="display:block;width:100%;height:100%"
         data-ad-client="${ADSENSE_CLIENT}"
         data-ad-slot="${slot}"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
  `;
  try {
    (window.adsbygoogle = window.adsbygoogle ?? []).push({});
  } catch {
    // AdSense script may not be loaded yet — ignore; .push will retry on next mount.
  }
}

export function loadAdSenseScript(): void {
  if (IS_DEV || !ADSENSE_CLIENT) return;
  if (document.querySelector('script[data-adsense]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.dataset.adsense = '1';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  document.head.appendChild(s);
}
