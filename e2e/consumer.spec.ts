import { apps, expect, test } from './fixtures.ts';

// The consumer is built from the packed tarball by `pnpm consumer:build` (scripts/consumer.ts), outside the workspace.
test.describe('E2E-008 external package consumer', () => {
  test('host navigation reaches the documentation index with consumer-owned composition', async ({ page }) => {
    await page.goto(apps.consumer.url);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Make content work');
    await page.getByRole('link', { name: /Read the developer guide/ }).click();
    await expect(page).toHaveURL(`${apps.consumer.url}/docs`);
    await expect(page.getByRole('heading', { level: 1, name: 'ForgeCMS developer hub' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Onboarding path' })).toBeVisible();
    await expect(page).toHaveTitle('ForgeCMS developer hub');
  });

  test('documentation content, custom slug and hydration work from the packed library', async ({ page, request }) => {
    expect((await request.get(`${apps.consumer.url}/docs/onboarding/first-application`)).status()).toBe(200);
    expect((await request.get(`${apps.consumer.url}/docs/getting-started`)).status()).toBe(404);

    await page.goto(`${apps.consumer.url}/docs/onboarding/first-application`);
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
    await page.goto(`${apps.consumer.url}/docs/onboarding/first-application`);
    await page.getByRole('link', { name: 'Content models' }).first().click();
    await expect(page).toHaveURL(`${apps.consumer.url}/docs/concepts/models`);
    await expect(page.getByRole('heading', { level: 1, name: 'Content models' })).toBeVisible();
    await expect(page).toHaveTitle('Content models · ForgeCMS Developers');
  });
});
