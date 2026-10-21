import { apps, expect, test } from './fixtures.ts';

const color = (page: import('@playwright/test').Page, selector: string, property: 'color' | 'backgroundColor') =>
  page
    .locator(selector)
    .first()
    .evaluate((el, p) => getComputedStyle(el)[p as 'color'], property);

test.describe('E2E-007 theme isolation', () => {
  test('documentation follows the host theme and host routes are unaffected', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/overview`);
    const site = page.locator('.volt-site');
    await expect(site).toHaveAttribute('data-theme', 'dark');
    const darkArticle = await color(page, '.doq-article', 'color');
    const darkTitle = await color(page, '.doq-doc-header h1', 'color');

    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(site).toHaveAttribute('data-theme', 'light');
    expect(await color(page, '.doq-article', 'color')).not.toBe(darkArticle);
    expect(await color(page, '.doq-doc-header h1', 'color')).not.toBe(darkTitle);

    // The host landing page keeps its own look: no Doq nodes, and the heading uses the host's light theme colour.
    await page.getByRole('link', { name: /Vanta/ }).first().click();
    await expect(page.locator('.landing-a')).toBeVisible();
    await expect(page.locator('.doq-root, .doq-index')).toHaveCount(0);
    const landingHeading = await color(page, '.landing-a h1', 'color');

    // The same landing heading, loaded fresh in the light theme without ever visiting docs, is identical.
    const fresh = await page.context().newPage();
    await fresh.goto(apps.a.url);
    await fresh.getByRole('button', { name: 'Switch to light theme' }).click();
    expect(await color(fresh, '.landing-a h1', 'color')).toBe(landingHeading);
  });

  test('documentation styles load only through the host stylesheet and keep the host page background', async ({
    page,
  }) => {
    await page.goto(apps.b.url);
    const before = await color(page, 'body', 'backgroundColor');
    await page.goto(`${apps.b.url}/docs`);
    await page
      .getByRole('link', { name: /Developers|Developer guide/ })
      .first()
      .click();
    await page.goto(apps.b.url);
    expect(await color(page, 'body', 'backgroundColor')).toBe(before);
  });
});
