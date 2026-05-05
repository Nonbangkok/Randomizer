// Page-level boot wrapper. Every tool page does the same dance:
//   1. await some async init (load WASM, run first generate)
//   2. on success — hide #loading-state, show #main-content
//   3. on failure — log + render a fallback UI with a retry button
// `bootPage` collapses that into a single call, eliminating the duplicated
// try/catch + element-toggling in each page entry.

const LOADING_ID = 'loading-state';
const CONTENT_ID = 'main-content';

function reveal(): void {
  const loader = document.getElementById(LOADING_ID);
  const content = document.getElementById(CONTENT_ID);
  if (loader) loader.style.display = 'none';
  if (content) content.style.display = 'block';
}

function showFallback(err: unknown): void {
  console.error('Page failed to initialise', err);
  const loader = document.getElementById(LOADING_ID);
  const content = document.getElementById(CONTENT_ID);
  if (loader) loader.style.display = 'none';
  const target = content ?? loader;
  if (!target) return;
  target.style.display = 'block';
  target.innerHTML = `
    <div class="container error-fallback" role="alert">
      <h2>Something went wrong</h2>
      <p>We couldn't finish loading this tool. Reloading the page usually fixes it.</p>
      <button type="button" class="btn btn--primary" data-error-retry>Reload page</button>
    </div>
  `;
  target.querySelector<HTMLButtonElement>('[data-error-retry]')
    ?.addEventListener('click', () => location.reload());
}

/**
 * Run a tool's async init. On success the loading shell is hidden and the
 * main content revealed; on failure a retry-able fallback replaces the main
 * content. Returns the resolved value of `init`, or undefined on failure.
 */
export async function bootPage<T>(init: () => Promise<T>): Promise<T | undefined> {
  try {
    const value = await init();
    reveal();
    return value;
  } catch (err) {
    showFallback(err);
    return undefined;
  }
}
