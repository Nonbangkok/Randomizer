import { test, expect } from '@playwright/test';
import { waitForToolReady } from './helpers.js';

test('game-idea: renders all 4 dimensions on load', async ({ page }) => {
  await page.goto('/tools/game-idea/');
  await waitForToolReady(page, '[data-game-idea]');
  await expect(page.locator('.gi-dim').first()).toBeVisible({ timeout: 10_000 });
  const dims = await page.locator('.gi-dim').count();
  expect(dims).toBe(4);
});

test('game-idea: generate button produces new idea', async ({ page }) => {
  await page.goto('/tools/game-idea/');
  await waitForToolReady(page, '[data-game-idea]');
  await page.locator('.gi-dim').first().waitFor({ timeout: 5_000 });
  const before = await page.locator('.gi-dim__value').allInnerTexts();

  await page.locator('[data-gi-generate]').click();
  await page.waitForTimeout(500);
  const after = await page.locator('.gi-dim__value').allInnerTexts();
  // At least one dimension should differ (extremely unlikely to be identical)
  const changed = before.some((v, i) => v !== after[i]);
  expect(changed).toBe(true);
});

test('game-idea: reroll single dimension preserves others', async ({ page }) => {
  await page.goto('/tools/game-idea/');
  await waitForToolReady(page, '[data-game-idea]');
  await page.locator('.gi-dim').first().waitFor({ timeout: 5_000 });

  const allBefore = await page.locator('.gi-dim__value').allInnerTexts();
  // Hover to reveal the reroll button on the first dim, then click it
  const firstDim = page.locator('.gi-dim').first();
  await firstDim.hover();
  await firstDim.locator('[data-gi-reroll]').click();
  await page.waitForTimeout(500);

  const allAfter = await page.locator('.gi-dim__value').allInnerTexts();
  // Dims 1-3 (indices 1,2,3) should be unchanged; dim 0 may differ
  expect(allAfter[1]).toBe(allBefore[1]);
  expect(allAfter[2]).toBe(allBefore[2]);
  expect(allAfter[3]).toBe(allBefore[3]);
});

test('game-idea: share link with seed reproduces same idea', async ({ page, context }) => {
  await page.goto('/tools/game-idea/?seed=12345');
  await waitForToolReady(page, '[data-game-idea]');
  await page.locator('.gi-dim').first().waitFor({ timeout: 5_000 });
  const idea1 = await page.locator('.gi-dim__value').allInnerTexts();

  const page2 = await context.newPage();
  await page2.goto('/tools/game-idea/?seed=12345');
  await waitForToolReady(page2, '[data-game-idea]');
  await page2.locator('.gi-dim').first().waitFor({ timeout: 5_000 });
  const idea2 = await page2.locator('.gi-dim__value').allInnerTexts();

  expect(idea2).toEqual(idea1);
});
