import { test, expect } from '@playwright/test';
import { waitForToolReady } from './helpers.js';

test('name-generator: auto-generates on load and renders cards', async ({ page }) => {
  await page.goto('/tools/name-generator/');
  await waitForToolReady(page, '[data-name-generator]');
  await expect(page.locator('[data-ng-results] .ng-card')).toHaveCount(8, { timeout: 10_000 });
});

test('name-generator: clicking Generate refreshes the cards', async ({ page }) => {
  await page.goto('/tools/name-generator/');
  await waitForToolReady(page, '[data-name-generator]');
  const cards = page.locator('[data-ng-results] .ng-card');
  await expect(cards).toHaveCount(8);
  const before = (await cards.allInnerTexts()).join('|');
  await page.locator('button.ng-generate').click();
  // Names are random — collisions across two full sets of 8 are vanishingly rare.
  await expect.poll(async () => (await cards.allInnerTexts()).join('|')).not.toBe(before);
});

test('name-generator: favorite persists across reload', async ({ page }) => {
  await page.goto('/tools/name-generator/');
  await waitForToolReady(page, '[data-name-generator]');

  const firstCard = page.locator('[data-ng-results] .ng-card').first();
  const firstName = await firstCard.locator('.ng-card__name').innerText();
  await firstCard.locator('[data-fav-id]').click();

  await page.reload();
  await waitForToolReady(page, '[data-name-generator]');

  // The favorited name should appear in the history/favorites panel.
  const panel = page.locator('[data-ng-history]');
  await expect(panel).toContainText(firstName, { timeout: 5_000 });
});

test('name-generator: share URL hydrates the form', async ({ page }) => {
  await page.goto('/tools/name-generator/?genre=scifi&language=th');
  await waitForToolReady(page, '[data-name-generator]');
  await expect(page.locator('input[name="genre"][value="scifi"]')).toBeChecked();
  await expect(page.locator('input[name="language"][value="th"]')).toBeChecked();
});
