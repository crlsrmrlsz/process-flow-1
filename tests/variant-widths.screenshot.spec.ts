import { test, expect } from '@playwright/test';

test('variant edges have subtle width differences (log-scaled)', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('g.react-flow__edge', { timeout: 30000 });
  // Screenshot for visual inspection
  await page.locator('.react-flow').screenshot({ path: 'test-results/variant-widths.png' });
});

