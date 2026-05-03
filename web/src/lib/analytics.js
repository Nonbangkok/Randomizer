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
