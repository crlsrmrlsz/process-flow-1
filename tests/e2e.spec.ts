import { test, expect } from '@playwright/test';

test('app loads and reveals edges with slider; selecting node updates details', async ({ page }) => {
  await page.goto('/');

  // Wait for title
  await expect(page.getByText('Process Flow Explorer')).toBeVisible();

  // Wait for graph to initialize (Details panel header appears once graph is ready)
  await expect(page.getByRole('heading', { name: 'Details' })).toBeVisible();

  // Initially, no edges should be visible
  await expect(page.locator('[data-testid="edge"]')).toHaveCount(0);

  // Advance one step using the button
  await page.getByRole('button', { name: 'Next step' }).click();

  // Some transitions should be computed now
  const countText = await page.locator('[data-testid="visible-edges-count"]').textContent();
  const count = Number(countText || '0');
  expect(count).toBeGreaterThan(0);
  const domEdgesCount = await page.locator('g.react-flow__edge').count();
  expect(domEdgesCount).toBeGreaterThan(0);

  // Node A should be visible at step 1
  const nodeA = page.locator('[data-testid="node-A"]');
  await expect(nodeA).toBeVisible();
  await nodeA.click();

  // Details panel should update with Node: A
  await expect(page.getByText('Node: A')).toBeVisible();
});
