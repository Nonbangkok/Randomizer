// Hover-prefetch for navigation links. The first time the user's cursor enters
// a link, inject a `<link rel="prefetch">` for its href so the next-page HTML
// (and the JS chunks it discovers) starts loading before the click. Idempotent
// per link; subsequent hovers are no-ops.

const prefetched = new Set<string>();

function prefetch(href: string): void {
  if (prefetched.has(href)) return;
  prefetched.add(href);
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}

export function prefetchOnHover(el: HTMLAnchorElement): void {
  // touchstart covers tap-without-click on mobile (where mouseenter never fires).
  const trigger = (): void => prefetch(el.href);
  el.addEventListener('mouseenter', trigger, { once: true, passive: true });
  el.addEventListener('touchstart', trigger, { once: true, passive: true });
  el.addEventListener('focus', trigger, { once: true });
}

export function prefetchAll(els: Iterable<HTMLAnchorElement>): void {
  for (const el of els) prefetchOnHover(el);
}
