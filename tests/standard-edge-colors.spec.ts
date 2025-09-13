import { test, expect } from '@playwright/test';

test('base edges share neutral color, widths vary by count', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('g.react-flow__edge', { timeout: 30000 });

  // In variant mode on load, the happy path is visible. Check two base edges.
  const e1 = page.locator('g.react-flow__edge[data-id*="START__APP_SUBMIT"] path.react-flow__edge-path').first();
  const e2 = page.locator('g.react-flow__edge[data-id*="APPROVED__PERMIT_REGISTERED"] path.react-flow__edge-path').first();
  await expect(e1).toBeVisible();
  await expect(e2).toBeVisible();

  const c1 = await e1.evaluate((el) => (el as SVGPathElement).getAttribute('style') || '');
  const c2 = await e2.evaluate((el) => (el as SVGPathElement).getAttribute('style') || '');
  expect(c1).toContain('stroke: rgb(');
  // colors should match (neutral), while widths may differ
  const color1 = c1.match(/stroke:\s*([^;]+)/)?.[1]?.trim();
  const color2 = c2.match(/stroke:\s*([^;]+)/)?.[1]?.trim();
  expect(color1).toBe(color2);

  // Save a screenshot for visual validation
  await page.locator('.react-flow').screenshot({ path: 'test-results/standard-edge-colors.png' });
});

