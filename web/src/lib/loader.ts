export const LOADER_HTML = `
<div class="loader" role="status" aria-label="Loading">
  <div class="loader__stage">
    <div class="loader__ring"></div>
    <div class="loader__ring loader__ring--inner"></div>
    <svg class="loader__logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle class="loader__dot loader__dot--1" cx="8" cy="8" r="1.25" />
      <circle class="loader__dot loader__dot--2" cx="16" cy="8" r="1.25" />
      <circle class="loader__dot loader__dot--3" cx="12" cy="12" r="1.25" />
      <circle class="loader__dot loader__dot--4" cx="8" cy="16" r="1.25" />
      <circle class="loader__dot loader__dot--5" cx="16" cy="16" r="1.25" />
    </svg>
  </div>
  <p class="loader__text">Initializing App…</p>
</div>
`;

export function showLoader(container: Element | null): void {
  if (!container) return;
  container.innerHTML = LOADER_HTML;
}

export function hideLoader(container: Element | null): void {
  if (!container) return;
  container.innerHTML = '';
}
