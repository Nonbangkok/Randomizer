import { test, expect } from '@playwright/test';
import { waitForToolReady } from './helpers.js';

test('gacha-simulator: renders result on load', async ({ page }) => {
  await page.goto('/tools/gacha-simulator/');
  await waitForToolReady(page, '[data-gacha-simulator]');
  await expect(page.locator('.gs-summary')).toBeVisible({ timeout: 10_000 });
});

test('gacha-simulator: Genshin preset 10-pull shows 10 rows', async ({ page }) => {
  await page.goto('/tools/gacha-simulator/');
  await waitForToolReady(page, '[data-gacha-simulator]');
  await page.locator('[data-gs-count="10"]').click();
  await page.locator('#gs-pull-btn').click();
  await expect(page.locator('.gs-pull').first()).toBeVisible({ timeout: 5_000 });
  const count = await page.locator('.gs-pull').count();
  expect(count).toBe(10);
});

test('gacha-simulator: 100-pull shows summary with total', async ({ page }) => {
  await page.goto('/tools/gacha-simulator/');
  await waitForToolReady(page, '[data-gacha-simulator]');
  await page.locator('[data-gs-count="100"]').click();
  await page.locator('#gs-pull-btn').click();
  await expect(page.locator('.gs-summary__n').first()).toBeVisible({ timeout: 10_000 });
  const totalText = await page.locator('.gs-summary__n').first().innerText();
  expect(parseInt(totalText, 10)).toBe(100);
});

test('gacha-simulator: custom mode shows tier editor', async ({ page }) => {
  await page.goto('/tools/gacha-simulator/');
  await waitForToolReady(page, '[data-gacha-simulator]');
  await page.locator('[name="mode"][value="custom"]').click();
  await expect(page.locator('[data-gs-custom]')).toHaveClass(/is-open/, { timeout: 2_000 });
  await expect(page.locator('[data-gs-tiers]')).toBeVisible();
});

test('gacha-simulator: HSR preset pulls correctly', async ({ page }) => {
  await page.goto('/tools/gacha-simulator/');
  await waitForToolReady(page, '[data-gacha-simulator]');
  await page.locator('[name="mode"][value="honkai_star_rail"]').click();
  await page.locator('[data-gs-count="10"]').click();
  await page.locator('#gs-pull-btn').click();
  const count = await page.locator('.gs-pull').count();
  expect(count).toBe(10);
});
