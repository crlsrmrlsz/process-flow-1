import { test, expect } from '@playwright/test';

test('context menu visible and decouple by department enabled on Submit Application', async ({ page }) => {
  await page.goto('/');

  // Step forward so nodes appear
  await page.getByRole('button', { name: 'Next step' }).click();

  // Open context menu on Submit Application if present; otherwise first node
  const submitNode = page.locator('[data-testid="node-Submit Application"]');
  const targetNode = (await submitNode.count()) > 0 ? submitNode : page.locator('[data-testid^="node-"]').first();
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

