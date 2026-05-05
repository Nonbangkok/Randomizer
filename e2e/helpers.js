// Wait for the loader to disappear and the tool root to render its form.
// Tool pages keep `#loading-state` visible until WASM has loaded.
export async function waitForToolReady(page, mountSelector) {
  await page.locator('#loading-state').waitFor({ state: 'hidden', timeout: 30_000 });
  await page.locator(`${mountSelector} form, ${mountSelector} button`).first().waitFor({ timeout: 10_000 });
}
