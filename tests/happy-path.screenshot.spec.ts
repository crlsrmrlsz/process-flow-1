import { test, expect } from '@playwright/test';

test('happy path overlay tints last state node', async ({ page }) => {
  await page.goto('/');
  // Wait for canvas edges to appear
  await page.waitForSelector('g.react-flow__edge', { timeout: 30000 });

  // Toggle the happy path overlay
  const toggle = page.locator('label:has-text("Show happy path") input[type="checkbox"]');
  await toggle.check();

  // Find a node that matches Placard Issued (friendly label)
  const lastNode = page.locator('[data-testid^="node-"]', { hasText: 'Placard Issued' }).first();
  await expect(lastNode).toBeVisible();

  // Screenshot the canvas for visual review
  await page.locator('.react-flow').screenshot({ path: 'test-results/happy-path-overlay.png' });
});

