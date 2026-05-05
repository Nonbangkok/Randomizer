import { test, expect } from '@playwright/test';
import { waitForToolReady } from './helpers.js';

test('password-generator: renders a password and refresh changes it', async ({ page }) => {
  await page.goto('/tools/password-generator/');
  await waitForToolReady(page, '[data-password-generator]');

  const display = page.locator('[data-pg-display]');
  await expect(display).not.toBeEmpty();
  const first = await display.innerText();
  expect(first.length).toBeGreaterThan(0);

  await page.locator('[data-pg-refresh]').click();
  await expect.poll(async () => display.innerText()).not.toBe(first);
});

test('password-generator: length slider updates output length', async ({ page }) => {
  await page.goto('/tools/password-generator/');
  await waitForToolReady(page, '[data-password-generator]');

  const slider = page.locator('[data-pg-length]');
  await slider.fill('32');
  // Trigger input/change so the form's listeners react.
  await slider.dispatchEvent('input');
  await slider.dispatchEvent('change');

  await expect.poll(async () => (await page.locator('[data-pg-display]').innerText()).length, {
    timeout: 5_000,
  }).toBe(32);
});

test('password-generator: strength meter renders a non-empty label', async ({ page }) => {
  await page.goto('/tools/password-generator/');
  await waitForToolReady(page, '[data-password-generator]');
  await expect(page.locator('[data-pg-meter-label]')).not.toHaveText('—');
});
