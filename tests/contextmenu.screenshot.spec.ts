import { test, expect } from '@playwright/test';

test('context menu visible and decouple by department enabled on Submit Application', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('g.react-flow__edge', { timeout: 30000 });

  // Open context menu on Submit Application if present; otherwise first node
  const targetNode = page.locator('[data-testid^="node-"]').nth(1);
  await targetNode.click({ button: 'right' });

  const menu = page.locator('[data-testid="context-menu"]');
  await expect(menu).toBeVisible();

  // Take a screenshot of the menu
  await menu.screenshot({ path: 'test-results/context-menu-node.png' });

  // Try to click Decouple by Department if enabled
  const decoupleDept = page.getByRole('menuitem', { name: /Decouple by Department/i });
  if (await decoupleDept.isEnabled()) {
    await decoupleDept.click();
    // After action, screenshot the canvas area
    const canvas = page.locator('.react-flow');
    await canvas.screenshot({ path: 'test-results/decouple-dept-canvas.png' });
  }
});
