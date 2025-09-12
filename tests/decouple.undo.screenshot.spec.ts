import { test, expect } from '@playwright/test';

test('decouple → undo → reset downstream (with screenshots)', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('g.react-flow__edge', { timeout: 30000 });

  // Pick a reasonable node (second if available)
  const nodes = page.locator('[data-testid^="node-"]');
  const count = await nodes.count();
  const target = count > 1 ? nodes.nth(1) : nodes.first();

  // 1) Decouple by Person
  await target.click({ button: 'right' });
  const decouplePerson = page.getByRole('menuitem', { name: /Decouple by Person/i });
  if (await decouplePerson.isVisible() && await decouplePerson.isEnabled()) {
    await decouplePerson.click();
  }
  await page.locator('.react-flow').screenshot({ path: 'test-results/decouple-applied.png' });

  // 2) Undo decouple
  await target.click({ button: 'right' });
  const undoItem = page.getByRole('menuitem', { name: /Undo decouple by Person/i });
  if (await undoItem.isVisible()) {
    await undoItem.click();
    await page.locator('.react-flow').screenshot({ path: 'test-results/undo-decouple.png' });
  }

  // 3) Apply decouple again and Reset downstream
  await target.click({ button: 'right' });
  if (await decouplePerson.isVisible() && await decouplePerson.isEnabled()) await decouplePerson.click();
  await target.click({ button: 'right' });
  const resetDown = page.getByRole('menuitem', { name: /Reset decouples downstream/i });
  if (await resetDown.isVisible()) {
    try {
      await resetDown.scrollIntoViewIfNeeded();
      await resetDown.click({ timeout: 1000 });
    } catch {}
  }
  await page.locator('.react-flow').screenshot({ path: 'test-results/reset-decouples-downstream.png' });
});
