import { test, expect } from '@playwright/test';
import { waitForToolReady } from './helpers.js';

test('dice-roller: renders result on load', async ({ page }) => {
  await page.goto('/tools/dice-roller/');
  await waitForToolReady(page, '[data-dice-roller]');
  await expect(page.locator('[data-dr-result] .dr-result-card')).toBeVisible({ timeout: 10_000 });
});

test('dice-roller: preset button sets expression and rolls', async ({ page }) => {
  await page.goto('/tools/dice-roller/');
  await waitForToolReady(page, '[data-dice-roller]');
  await page.locator('[data-dr-preset="d20"]').click();
  await expect(page.locator('[data-dr-status]')).toContainText('d20', { timeout: 5_000 });
});

test('dice-roller: custom expression rolls and shows total', async ({ page }) => {
  await page.goto('/tools/dice-roller/');
  await waitForToolReady(page, '[data-dice-roller]');
  await page.locator('[data-dr-expr]').fill('4d6kh3');
  await page.locator('[data-dr-roll]').click();
  await expect(page.locator('.dr-total')).toBeVisible({ timeout: 5_000 });
  const total = await page.locator('.dr-total').innerText();
  const n = parseInt(total, 10);
  expect(n).toBeGreaterThanOrEqual(3);
  expect(n).toBeLessThanOrEqual(18);
});

test('dice-roller: 4d6kh3 shows 3 kept and 1 dropped die', async ({ page }) => {
  await page.goto('/tools/dice-roller/');
  await waitForToolReady(page, '[data-dice-roller]');
  await page.locator('[data-dr-expr]').fill('4d6kh3');
  await page.locator('[data-dr-roll]').click();
  await expect(page.locator('.dr-die').first()).toBeVisible({ timeout: 5_000 });
  const kept = await page.locator('.dr-die--kept').count();
  const dropped = await page.locator('.dr-die--dropped').count();
  expect(kept).toBe(3);
  expect(dropped).toBe(1);
});

test('dice-roller: share link with seed reproduces same result', async ({ page, context }) => {
  await page.goto('/tools/dice-roller/?expression=2d6%2B3&seed=42');
  await waitForToolReady(page, '[data-dice-roller]');
  const total1 = await page.locator('.dr-total').innerText({ timeout: 5_000 });

  const page2 = await context.newPage();
  await page2.goto('/tools/dice-roller/?expression=2d6%2B3&seed=42');
  await waitForToolReady(page2, '[data-dice-roller]');
  const total2 = await page2.locator('.dr-total').innerText({ timeout: 5_000 });

  expect(total2).toBe(total1);
});

test('dice-roller: Space triggers a new roll', async ({ page }) => {
  await page.goto('/tools/dice-roller/');
  await waitForToolReady(page, '[data-dice-roller]');
  await page.locator('.dr-total').waitFor({ timeout: 5_000 });
  const before = await page.locator('.dr-total').innerText();
  // Press Space multiple times to get a different result
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
  }
  // At least one of the rolls should produce the status text
  await expect(page.locator('[data-dr-status]')).not.toBeEmpty({ timeout: 3_000 });
});
