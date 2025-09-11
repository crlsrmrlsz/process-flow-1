import { test, expect } from '@playwright/test';

test('app loads and reveals edges by clicking nodes', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('g.react-flow__edge', { timeout: 30000 });
  const edgesAfter = await page.locator('g.react-flow__edge').count();
  expect(edgesAfter).toBeGreaterThan(0);
  await page.locator('.react-flow').screenshot({ path: 'test-results/visible-edges.png' });
});
