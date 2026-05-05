import { test, expect } from '@playwright/test';
import { waitForToolReady } from './helpers.js';

test('backlog-wheel: spin button is disabled with fewer than 2 items', async ({ page }) => {
  await page.goto('/tools/backlog-wheel/');
  await waitForToolReady(page, '[data-backlog-wheel]');
  const textarea = page.locator('[data-bw-input]');
  await textarea.fill('only one');
  await expect(page.locator('[data-bw-spin]')).toBeDisabled();
});

test('backlog-wheel: adding items + spinning picks one', async ({ page }) => {
  await page.goto('/tools/backlog-wheel/');
  await waitForToolReady(page, '[data-backlog-wheel]');
  const items = ['Hollow Knight', 'Celeste', 'Hades'];
  await page.locator('[data-bw-input]').fill(items.join('\n'));
  await expect(page.locator('[data-bw-spin]')).toBeEnabled();

  await page.locator('[data-bw-spin]').click();
  // Animation runs ~1.6s; wait for the spin to land.
  await expect.poll(async () => {
    const text = (await page.locator('[data-bw-result]').innerText()).trim();
    return items.includes(text) ? text : null;
  }, { timeout: 5_000 }).not.toBeNull();
});

test('backlog-wheel: list survives reload via storage', async ({ page }) => {
  await page.goto('/tools/backlog-wheel/');
  await waitForToolReady(page, '[data-backlog-wheel]');
  await page.locator('[data-bw-input]').fill('A\nB\nC');
  // Allow the input handler to persist.
  await page.waitForTimeout(100);
  await page.reload();
  await waitForToolReady(page, '[data-backlog-wheel]');
  await expect(page.locator('[data-bw-input]')).toHaveValue('A\nB\nC');
});

test('backlog-wheel: share URL hydrates the list', async ({ page }) => {
  // Encoded "X\nY\nZ" via the same RFC 4648 §5 url-safe base64 used by share.js.
  // Computed: btoa("X\nY\nZ") = "WApZClo=", then strip '=' and swap +/ → -_.
  await page.goto('/tools/backlog-wheel/?list=WApZClo');
  await waitForToolReady(page, '[data-backlog-wheel]');
  await expect(page.locator('[data-bw-input]')).toHaveValue('X\nY\nZ');
});
