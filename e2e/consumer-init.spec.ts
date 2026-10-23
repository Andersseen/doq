import { apps, expect, test } from './fixtures.ts';

// Applications that were bare Analog hosts, adopted Doqs with `doq init` and the printed snippets, and were built from the
// packed tarball (scripts/init-consumer.ts). The host pages stay; the documentation appears exactly where the mode says.
test.describe('E2E-101 newly initialized consumers', () => {
  test('DX-016 embedded: the host page and /docs both work, with the generated starter pages', async ({ page }) => {
    await page.goto(apps.initEmbedded.url);
    await expect(page.getByRole('heading', { level: 1, name: 'Acme home' })).toBeVisible();
    await page.getByRole('link', { name: 'Docs' }).click();
    await expect(page).toHaveURL(`${apps.initEmbedded.url}/docs`);
    await expect(page.locator('.doq-index, main').first()).toBeVisible();
    await page.goto(`${apps.initEmbedded.url}/docs/getting-started`);
    await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeVisible();
    await expect(page.locator('.doq-callout')).toBeVisible();
    await page.getByRole('link', { name: 'Introduction' }).first().click();
    await expect(page).toHaveURL(`${apps.initEmbedded.url}/docs/introduction`);
    await expect(page.getByRole('heading', { level: 1, name: 'Introduction' })).toBeFocused();
    // Search was never enabled: no search button, no Pagefind request.
    await expect(page.getByRole('button', { name: /^Search/ })).toHaveCount(0);
  });

  test('DX-016 docs-first: documentation owns the root and the host keeps its own route', async ({ page }) => {
    await page.goto(apps.initDocsFirst.url);
    await expect(page.locator('.doq-index')).toBeVisible();
    await page.goto(`${apps.initDocsFirst.url}/getting-started`);
    await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeVisible();
    await page.goto(`${apps.initDocsFirst.url}/about`);
    await expect(page.getByRole('heading', { level: 1, name: 'About Acme' })).toBeVisible();
  });
});
