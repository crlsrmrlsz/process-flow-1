import { test, expect } from '@playwright/test';

test('edge labels are numbers and do not overlap lines (screenshot)', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('g.react-flow__edge', { timeout: 30000 });
  // Screenshot for manual verification that labels (numbers) are offset from lines
  await page.locator('.react-flow').screenshot({ path: 'test-results/edge-labels.png' });
});

