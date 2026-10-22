import { apps, expect, test } from './fixtures.ts';

// A Doqs 0.5-style configuration ({ contentDirectory, basePath } only) built from the 0.6 tarball outside the monorepo.
// Everything that existed in 0.5 must be byte-for-byte the same public behaviour: URLs, markup, search, no archive routes.
test.describe('E2E-113 backward compatibility: consumer without versioning', () => {
  test('embedded (/docs): same URLs, no selector, no filter attribute, unfiltered search', async ({
    page,
    request,
  }) => {
    await page.goto(`${apps.consumerLegacyA.url}/docs/installation`);
    await expect(page.getByRole('heading', { level: 1, name: 'Installation' })).toBeVisible();
    await expect(page.locator('.doq-version, .doq-version-notice, [data-doq-version]')).toHaveCount(0);
    await expect(page.locator('article')).not.toHaveAttribute('data-pagefind-filter', /.*/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page).toHaveTitle('Installation · Vanta UI');
    await page.getByRole('button', { name: 'Search', exact: false }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Search documentation' });
    await dialog.getByRole('searchbox', { name: 'Search the documentation' }).fill('harbor-signal');
    await expect(dialog.getByRole('link', { name: /Installation/ })).toHaveAttribute('href', /^\/docs\/installation#/);
    for (const path of ['/docs/v/1/installation', '/docs/v/1'])
      expect((await request.get(`${apps.consumerLegacyA.url}${path}`)).status(), path).toBe(404);
    expect((await request.get(`${apps.consumerLegacyA.url}/docs`)).status()).toBe(200);
  });

  test('docs-first root: same URLs, generated reference and search, no archive routes', async ({ page, request }) => {
    await page.goto(`${apps.consumerLegacyB.url}/reference/generated/forge-client`);
    await expect(page.getByRole('heading', { level: 1, name: 'ForgeClient' })).toBeVisible();
    await expect(page.locator('.doq-version, [data-doq-version]')).toHaveCount(0);
    await expect(page.locator('article')).not.toHaveAttribute('data-pagefind-filter', /.*/);
    await page.getByRole('button', { name: 'Search', exact: false }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Search documentation' });
    await dialog.getByRole('searchbox', { name: 'Search the documentation' }).fill('tidewater-index');
    await expect(dialog.getByRole('link', { name: /API reference/ })).toHaveAttribute('href', /^\/reference\/api#/);
    expect((await request.get(`${apps.consumerLegacyB.url}/v/1`)).status()).toBe(404);
    expect((await request.get(`${apps.consumerLegacyB.url}/onboarding/first-application`)).status()).toBe(200);
  });
});
