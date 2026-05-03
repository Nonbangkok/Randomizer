/**
 * Google Analytics 4 Implementation
 * Measurement ID: G-J03Q59Q66P
 */
export function initGA() {
  const measurementId = 'G-J03Q59Q66P';

  // Prevent multiple initializations
  if (window.gtag) return;

  // Load Google Tag Manager Script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag function
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };

  gtag('js', new Date());
  gtag('config', measurementId, {
    page_path: window.location.pathname,
  });
}

/**
 * Track custom events for tool usage analytics.
 * 
 * @param {string} eventName - Event name (e.g. 'generate_name', 'copy_password')
 * @param {object} params - Additional parameters (e.g. { tool: 'name-generator', count: 1 })
 * 
 * Usage:
 *   trackEvent('generate_name', { tool: 'name-generator' });
 *   trackEvent('copy_password', { tool: 'password-generator', length: 16 });
 *   trackEvent('spin_wheel', { tool: 'backlog-wheel', items_count: 5 });
 */
export function trackEvent(eventName, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, {
      ...params,
      timestamp: Date.now(),
    });
  }
}
