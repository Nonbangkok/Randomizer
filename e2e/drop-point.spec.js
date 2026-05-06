import { test, expect } from '@playwright/test';
import { waitForToolReady } from './helpers.js';

test('drop-point: renders a location on load', async ({ page }) => {
  await page.goto('/tools/drop-point/');
  await waitForToolReady(page, '[data-drop-point]');
  await expect(page.locator('.dp-loc-name').first()).toBeVisible({ timeout: 10_000 });
});

test('drop-point: squad size 4 returns 4 locations', async ({ page }) => {
  await page.goto('/tools/drop-point/');
  await waitForToolReady(page, '[data-drop-point]');
  await page.locator('[name="player_count"]').fill('4');
  await page.locator('[name="player_count"]').press('Tab');
  await page.locator('[data-drop-point] button[type="submit"]').click();
  await expect(page.locator('.dp-location').first()).toBeVisible({ timeout: 5_000 });
  const count = await page.locator('.dp-location').count();
  expect(count).toBe(4);
});

test('drop-point: Apex game selector shows Apex locations', async ({ page }) => {
  await page.goto('/tools/drop-point/?game=apex_legends&player_count=1&seed=7');
  await waitForToolReady(page, '[data-drop-point]');
  await expect(page.locator('.dp-loc-name').first()).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('[name="game"][value="apex_legends"]')).toBeChecked();
});

test('drop-point: share link with seed reproduces same location', async ({ page, context }) => {
  await page.goto('/tools/drop-point/?game=universal&player_count=1&seed=99');
  await waitForToolReady(page, '[data-drop-point]');
  const loc1 = await page.locator('.dp-loc-name').first().innerText({ timeout: 5_000 });

  const page2 = await context.newPage();
  await page2.goto('/tools/drop-point/?game=universal&player_count=1&seed=99');
  await waitForToolReady(page2, '[data-drop-point]');
  const loc2 = await page2.locator('.dp-loc-name').first().innerText({ timeout: 5_000 });

  expect(loc2).toBe(loc1);
});

test('drop-point: Space triggers new drop', async ({ page }) => {
  await page.goto('/tools/drop-point/');
  await waitForToolReady(page, '[data-drop-point]');
  await page.locator('.dp-loc-name').first().waitFor({ timeout: 5_000 });
  await page.keyboard.press('Space');
  await expect(page.locator('[data-dp-status]')).not.toBeEmpty({ timeout: 3_000 });
});
