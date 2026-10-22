import { apps, expect, test } from './fixtures.ts';

// The consumer is built from the packed tarball by `pnpm consumer:build` (scripts/consumer.ts), outside the workspace.
test.describe('E2E-008 external package consumer', () => {
  test('the docs-first consumer serves the documentation index at the root with consumer-owned composition', async ({
    page,
  }) => {
    await page.goto(apps.consumer.url);
    await expect(page.getByRole('heading', { level: 1, name: 'ForgeCMS developer hub' })).toBeVisible();
    await expect(page.getByRole('link', { name: /ForgeCMS Developers/ }).first()).toHaveAttribute('href', '/');
    await expect(page.getByRole('region', { name: 'Onboarding path' })).toBeVisible();
    await expect(page).toHaveTitle('ForgeCMS developer hub');
  });

  test('documentation content, custom slug and hydration work from the packed library', async ({ page, request }) => {
    expect((await request.get(`${apps.consumer.url}/onboarding/first-application`)).status()).toBe(200);
    expect((await request.get(`${apps.consumer.url}/getting-started`)).status()).toBe(404);

    await page.goto(`${apps.consumer.url}/onboarding/first-application`);
    await expect(page.getByRole('heading', { level: 2, name: 'Create a workspace' })).toBeVisible();
    // Hydrated, not just prerendered: the consumer-owned Angular demo reacts to input.
    const demo = page.getByRole('region', { name: 'Forge content model demo' });
    await demo.getByLabel('Field type').selectOption('Reference');
    await expect(demo.locator('strong')).toHaveText('Reference');
    await expect(
      page.locator('body[ngh], [ng-server-context], app-root[ng-version], [ng-version]').first(),
    ).toBeAttached();
  });

  test('client navigation inside the docs keeps working and never errors', async ({ page }) => {
    await page.goto(`${apps.consumer.url}/onboarding/first-application`);
    await page.getByRole('link', { name: 'Content models' }).first().click();
    await expect(page).toHaveURL(`${apps.consumer.url}/concepts/models`);
    await expect(page.getByRole('heading', { level: 1, name: 'Content models' })).toBeVisible();
    await expect(page).toHaveTitle('Content models · ForgeCMS Developers');
  });

  test('search built by the packaged doq-search binary finds body text at the custom-slug route', async ({
    page,
    request,
  }) => {
    expect((await request.get(`${apps.consumer.url}/pagefind/pagefind.js`)).status()).toBe(200);
    expect((await request.get(`${apps.consumer.url}/pagefind/pagefind-entry.json`)).status()).toBe(200);

    await page.goto(`${apps.consumer.url}/concepts/models`);
    await page.getByRole('button', { name: /^Search/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Search documentation' });
    await dialog.getByRole('searchbox').fill('environment credentials out of browser bundles');
    const result = dialog.getByRole('link', { name: /Getting started/ }).first();
    await expect(result).toHaveAttribute('href', '/onboarding/first-application#create-a-workspace');
    await result.click();
    await expect(page).toHaveURL(`${apps.consumer.url}/onboarding/first-application#create-a-workspace`);
    await expect(page.locator('#create-a-workspace')).toBeInViewport();
    await expect(page.locator('#create-a-workspace')).toBeFocused();
    await expect(page.locator('a[href*="getting-started"]')).toHaveCount(0);
  });

  test('a direct fragment load scrolls to the heading in the packed library', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 400 });
    await page.goto(`${apps.consumer.url}/onboarding/first-application#request-an-entry`);
    await expect(page.locator('#request-an-entry')).toBeInViewport();
  });
});
