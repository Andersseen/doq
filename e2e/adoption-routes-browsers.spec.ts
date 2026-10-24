import { apps, expect, nextFocusKey, test } from './fixtures.ts';

// Focused cross-browser subset of the Angular Movement route-preserving proof (Chromium runs the full e2e/adoption-routes.spec.ts):
// navigation across the Doqs/host boundary, keyboard, playground controls, search dialog focus restoration and hydration.
const base = apps.adoptionRoutes.url;

test.describe('E2E-143 ADOPT browsers: Angular Movement at its original URLs', () => {
  test('navigation, history and hydration cross the Doqs/host boundary', async ({ page }) => {
    await page.goto(`${base}/docs/get-started`);
    await expect(page.getByRole('heading', { level: 1, name: 'Get started' })).toBeVisible();
    await expect(page.getByRole('main')).toHaveCount(1);
    await page.getByRole('link', { name: 'live demos' }).click();
    await expect(page).toHaveURL(`${base}/demos/enter`);
    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: 'Get started' })).toBeVisible();
    await page.reload();
    await expect(page.locator('doq-playground')).toBeVisible();
  });

  test('playground controls change the real directive and are reachable by keyboard', async ({ page }) => {
    await page.goto(`${base}/docs/get-started`);
    const playground = page.locator('doq-playground');
    await playground.getByLabel('Preset').selectOption('slide-left');
    await expect(playground.locator('[data-testid="am-target"]')).toHaveText('slide-left');
    await playground.getByLabel('Preset').focus();
    await page.keyboard.press(nextFocusKey(page));
    await expect(page.locator(':focus')).toBeVisible();
  });

  test('the search dialog opens by keyboard and focus returns to its button on Escape', async ({ page }) => {
    await page.goto(`${base}/docs/api-selection`);
    const trigger = page.getByRole('button', { name: 'Search', exact: false }).first();
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Search documentation' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});
