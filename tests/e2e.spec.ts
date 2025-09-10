import { test, expect } from '@playwright/test';

test('app loads and reveals edges with slider; selecting a node updates details', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Process Flow Explorer')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Details' })).toBeVisible();

  await expect(page.locator('[data-testid="edge"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Next step' }).click();

  const countText = await page.locator('[data-testid="visible-edges-count"]').textContent();
  const count = Number(countText || '0');
  expect(count).toBeGreaterThan(0);
  const domEdgesCount = await page.locator('g.react-flow__edge').count();
  expect(domEdgesCount).toBeGreaterThan(0);

  // Click the first visible node to update details
  const firstNode = page.locator('[data-testid^="node-"]').first();
  await expect(firstNode).toBeVisible();
  await firstNode.click();
  await expect(page.getByText(/Node:/)).toBeVisible();
});
