import { apps, expect, test } from './fixtures.ts';

test.describe('E2E-015 search disabled', () => {
  test('a build with search disabled has no search UI, no shortcut and no index requests', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto(`${apps.noSearch.url}/onboarding/first-application`);
    await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Search/ })).toHaveCount(0);
    await expect(page.locator('dialog, doq-search')).toHaveCount(0);

    const prevented = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });
      document.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(prevented).toBe(false);
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(requests.filter((url) => url.includes('pagefind'))).toEqual([]);
    expect((await page.request.get(`${apps.noSearch.url}/pagefind/pagefind.js`)).status()).toBe(404);
  });

  test('the rest of the documentation experience is intact', async ({ page }) => {
    await page.goto(`${apps.noSearch.url}/`);
    await expect(page.getByRole('heading', { level: 1, name: 'ForgeCMS developer hub' })).toBeVisible();
    await page
      .getByRole('link', { name: /Getting started/ })
      .first()
      .click();
    await expect(page).toHaveURL(`${apps.noSearch.url}/onboarding/first-application`);
    await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeFocused();
    await expect(page.locator('.doq-root')).toHaveAttribute('data-sidebar', 'right');
    await expect(page.getByRole('complementary', { name: 'On this page' })).toHaveCount(0);
  });

  test('the search-enabled build requests no index before the reader interacts', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto(`${apps.b.url}/concepts/models`);
    await expect(page.getByRole('button', { name: /^Search/ })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(requests.filter((url) => url.includes('pagefind'))).toEqual([]);
    await page.getByRole('button', { name: /^Search/ }).click();
    await page.getByRole('searchbox').fill('models');
    await expect(page.getByRole('dialog').getByRole('link').first()).toBeVisible();
    expect(requests.some((url) => url.endsWith('/pagefind/pagefind.js'))).toBe(true);
  });
});
