import { test, expect } from '@playwright/test';

test('app loads and reveals edges by clicking nodes', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid^="node-" ]', { timeout: 30000 });
  // Click a couple times to expand
  const first = page.locator('[data-testid^="node-"]').first();
  await first.click();
  await first.click();
  const edgesAfter = await page.locator('g.react-flow__edge').count();
  expect(edgesAfter).toBeGreaterThan(0);
});
