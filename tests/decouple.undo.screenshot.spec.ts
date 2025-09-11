import { test, expect } from '@playwright/test';

test('decouple by person → undo → reset downstream (with screenshots)', async ({ page }) => {
  await page.goto('/');

  // Step forward enough so REQ_CHECK is visible (approx depth 3)
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('button', { name: 'Next step' }).click();

  const reqCheck = page.locator('[data-testid="node-REQ_CHECK"]');
  const exists = await reqCheck.count();
  const target = exists > 0 ? reqCheck : page.locator('[data-testid^="node-"]').nth(2);

  // 1) Decouple by Person and screenshot
  await target.click({ button: 'right' });
  await page.getByRole('menuitem', { name: /Decouple by Person/i }).click();
  await page.locator('.react-flow').screenshot({ path: 'test-results/decouple-person.png' });

  // 2) Undo decouple by Person and screenshot
  await target.click({ button: 'right' });
  const undoItem = page.getByRole('menuitem', { name: /Undo decouple by Person/i });
  if (await undoItem.isVisible()) {
    await undoItem.click();
    await page.locator('.react-flow').screenshot({ path: 'test-results/undo-decouple-person.png' });
  }

  // 3) Apply two decouples then reset downstream and screenshot
  await target.click({ button: 'right' });
  const decouplePerson = page.getByRole('menuitem', { name: /Decouple by Person/i });
  if (await decouplePerson.isVisible()) await decouplePerson.click();
  await target.click({ button: 'right' });
  const decoupleDept = page.getByRole('menuitem', { name: /Decouple by Department/i });
  if (await decoupleDept.isVisible() && (await decoupleDept.isEnabled())) await decoupleDept.click();
  await target.click({ button: 'right' });
  const resetDown = page.getByRole('menuitem', { name: /Reset decouples downstream/i });
  if (await resetDown.isVisible()) {
    try {
      await resetDown.scrollIntoViewIfNeeded();
      await resetDown.click({ force: true, timeout: 1000 });
    } catch {}
  }
  await page.locator('.react-flow').screenshot({ path: 'test-results/reset-decouples-downstream.png' });
});
