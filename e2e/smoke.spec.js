import { test, expect } from '@playwright/test';

// One smoke entry per page registered in web/vite.config.js.
// Goal: catch broken HTML routes, missing entrypoints, and uncaught console errors.
const pages = [
  { url: '/', titleMatch: /Randomizer/i },
  { url: '/contact.html', titleMatch: /Contact/i },
  { url: '/privacy-policy.html', titleMatch: /Privacy/i },
  { url: '/terms.html', titleMatch: /Terms/i },
  { url: '/tools/name-generator/', titleMatch: /Name Generator/i },
  { url: '/tools/password-generator/', titleMatch: /Password/i },
  { url: '/tools/challenge-generator/', titleMatch: /Challenge/i },
  { url: '/tools/backlog-wheel/', titleMatch: /Backlog/i },
  { url: '/blog/', titleMatch: /Blog/i },
];

for (const { url, titleMatch } of pages) {
  test(`smoke: ${url} loads with no console errors`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

    const response = await page.goto(url);
    expect(response?.status(), `${url} returned ${response?.status()}`).toBeLessThan(400);
    await expect(page).toHaveTitle(titleMatch);

    // Filter out third-party noise (fonts/analytics that may be blocked locally).
    const meaningful = errors.filter((e) =>
      !/fonts\.googleapis|fonts\.gstatic|googletagmanager|google-analytics/i.test(e)
    );
    expect(meaningful, `console errors on ${url}:\n${meaningful.join('\n')}`).toEqual([]);
  });
}

test('smoke: theme toggle persists across reload', async ({ page }) => {
  await page.goto('/');
  const initial = await page.locator('html').getAttribute('data-theme');
  const toggle = page.getByRole('button', { name: /theme|dark|light/i }).first();
  if (await toggle.count()) {
    await toggle.click();
    const next = await page.locator('html').getAttribute('data-theme');
    expect(next).not.toBe(initial);
    await page.reload();
    expect(await page.locator('html').getAttribute('data-theme')).toBe(next);
  }
});
