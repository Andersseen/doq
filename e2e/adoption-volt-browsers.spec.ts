import { apps, expect, test } from './fixtures.ts';

// Focused cross-browser subset of the Volt UI proof (Chromium runs the full e2e/adoption-volt.spec.ts): playground controls on the real
// component, a real overlay with focus restoration, the expanded preview, navigation and hydration.
const base = apps.adoptionVolt.url;
const group = (page: import('@playwright/test').Page, name: string) => page.getByRole('group', { name, exact: true });

test.describe('E2E-144 ADOPT browsers: Volt UI at its original URLs', () => {
  test('the real volt-button follows the playground controls and reports its output', async ({ page }) => {
    await page.goto(`${base}/docs/components/button`);
    const playground = group(page, 'volt-button');
    const live = playground.locator('.doq-pg-frame button');
    await playground.getByLabel('Variant').selectOption('outline');
    await expect(live).toHaveAttribute('data-variant', 'outline');
    await live.click();
    await expect(playground.getByRole('list', { name: 'Events' })).toContainText('Pressed');
    await expect(page.getByRole('main')).toHaveCount(1);
  });

  test('a real dialog opens, closes with Escape and returns focus; the expanded preview keeps its instance and restores focus', async ({
    page,
  }) => {
    await page.goto(`${base}/docs/components/dialog`);
    const playground = group(page, 'voltDialogRoot');
    const trigger = playground.getByRole('button', { name: 'Open dialog' });
    // Opened by keyboard: WebKit does not focus a button on a mouse click, so there would be no focused opener to restore.
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Delete project?' });
    await expect(dialog.getByRole('button', { name: 'Confirm' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    const expand = playground.getByRole('button', { name: 'Expand' });
    await expand.click();
    await expect(page.getByRole('dialog', { name: /expanded preview/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(expand).toBeFocused();
  });

  test('client navigation to a host-owned page and back hydrates without errors', async ({ page }) => {
    await page.goto(`${base}/docs/components/popover`);
    await expect(page.getByRole('heading', { level: 1, name: 'Popover' })).toBeVisible();
    await page.locator('a[href="/docs/components"]').first().click();
    await expect(page).toHaveURL(`${base}/docs/components`);
    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: 'Popover' })).toBeVisible();
  });
});
