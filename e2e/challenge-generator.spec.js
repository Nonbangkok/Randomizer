import { test, expect } from '@playwright/test';
import { waitForToolReady } from './helpers.js';

test('challenge-generator: renders rules on load', async ({ page }) => {
  await page.goto('/tools/challenge-generator/');
  await waitForToolReady(page, '[data-challenge-generator]');
  const rules = page.locator('[data-cg-list] .cg-rule');
  await expect(rules.first()).toBeVisible({ timeout: 10_000 });
  expect(await rules.count()).toBeGreaterThan(0);
});

test('challenge-generator: share URL with seed reproduces same rules', async ({ page, context }) => {
  await page.goto('/tools/challenge-generator/?game=universal&difficulty=medium&count=5&seed=42');
  await waitForToolReady(page, '[data-challenge-generator]');
  const first = await page.locator('[data-cg-list]').innerText();

  const page2 = await context.newPage();
  await page2.goto('/tools/challenge-generator/?game=universal&difficulty=medium&count=5&seed=42');
  await waitForToolReady(page2, '[data-challenge-generator]');
  const second = await page2.locator('[data-cg-list]').innerText();

  expect(second).toBe(first);
});

test('challenge-generator: difficulty selection persists in URL', async ({ page }) => {
  await page.goto('/tools/challenge-generator/?difficulty=hardcore');
  await waitForToolReady(page, '[data-challenge-generator]');
  await expect(page.locator('input[name="difficulty"][value="hardcore"]')).toBeChecked();
});
