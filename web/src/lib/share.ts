// URL-state helpers for shareable tool configurations.
// Tools live-sync their form state into the address bar via writeParams(),
// hydrate from readParams() on mount, and expose a Share button that
// snapshots state (with a frozen seed if applicable) and copies the URL.

import { showToast } from './toast.js';

export type ParamValue = string | number | boolean | null | undefined;

export interface WriteParamsOptions {
  replace?: boolean;
}

export function readParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/**
 * Merge updates into the current URL's query string.
 * Pass `null`, `undefined`, `''`, or `false` to delete a param.
 */
export function writeParams(
  updates: Record<string, ParamValue>,
  { replace = true }: WriteParamsOptions = {},
): void {
  const p = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === undefined || v === '' || v === false) p.delete(k);
    else p.set(k, String(v));
  }
  const qs = p.toString();
  const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
}

export async function copyShareLink(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(window.location.href);
    showToast('Share link copied');
    return true;
  } catch {
    showToast('Copy failed');
    return false;
  }
}

// URL-safe base64 (RFC 4648 §5) for arbitrary text. Used for the backlog-wheel list.
export function encodeText(text: string | null | undefined): string {
  if (!text) return '';
  const b64 = btoa(unescape(encodeURIComponent(text)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeText(s: string | null | undefined): string | null {
  if (!s) return null;
  try {
    let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (b64.length % 4)) % 4;
    b64 += '='.repeat(pad);
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return null;
  }
}

// Generates a random non-zero u32 suitable for use as a seed.
export function randomSeed(): number {
  return (Math.floor(Math.random() * 0xfffffffe) + 1) >>> 0;
}

export interface ShareButtonOptions {
  label?: string;
}

// Reusable share-button HTML. Pair with `bindShareButton(el, handler)`.
export function shareButtonHtml({ label = 'Share' }: ShareButtonOptions = {}): string {
  return `
    <button type="button" class="btn btn--ghost btn--sm" data-share-btn aria-label="${label} link" title="${label} link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      ${label}
    </button>
  `;
}
