/**
 * Google Analytics 4 implementation.
 * Measurement ID: G-J03Q59Q66P
 */

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
  }
}

export function initGA(): void {
  if (window.gtag) return;

  if (document.readyState === 'complete') {
    setTimeout(doInit, 1500);
  } else {
    window.addEventListener('load', () => setTimeout(doInit, 1500));
  }
}

function doInit(): void {
  if (window.gtag) return;
  const measurementId = 'G-J03Q59Q66P';
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { page_path: window.location.pathname });
}

/**
 * Track custom events for tool usage analytics.
 *
 * Usage:
 *   trackEvent('generate_name', { tool: 'name-generator' });
 *   trackEvent('copy_password', { tool: 'password-generator', length: 16 });
 *   trackEvent('spin_wheel', { tool: 'backlog-wheel', items_count: 5 });
 */
export function trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, {
      ...params,
      timestamp: Date.now(),
    });
  }
}
