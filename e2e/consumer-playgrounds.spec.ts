import { apps, expect, test } from './fixtures.ts';

// The packed tarball, installed outside the workspace (`pnpm consumer:build`): no source aliases, no workspace links.
test.describe('E2E-116 packed consumers: interactive playgrounds', () => {
  test('embedded consumer (Angular 21, /docs): a real Volt UI button playground, prerendered and hydrated', async ({
    page,
    request,
  }) => {
    const html = await (await request.get(`${apps.consumerA.url}/docs/components/button`)).text();
    expect(html).toContain('data-doq-playground="vanta-button"');
    expect(html).toMatch(/<option[^>]*selected[^>]*>Medium<\/option>/);
    await page.goto(`${apps.consumerA.url}/docs/components/button`);
    const playground = page.getByRole('group', { name: 'Volt UI button', exact: true });
    const button = playground.locator('.doq-pg-frame button[voltbutton]');
    await playground.getByLabel('Variant').selectOption('Destructive');
    await expect(button).toHaveAttribute('data-variant', 'destructive');
    await playground.getByLabel('Disabled').check();
    await expect(button).toBeDisabled();
    await playground.getByRole('button', { name: 'Reset' }).click();
    await expect(button).toBeEnabled();
    await expect(button).toHaveAttribute('data-variant', 'solid');
    await expect(page.getByRole('complementary', { name: 'On this page' })).toContainText('Choose a style');
  });

  test('root consumer (docs-first, Angular 21): two independent playgrounds with numbers, selects and outputs', async ({
    page,
  }) => {
    await page.goto(`${apps.consumer.url}/concepts/models`);
    const request = page.getByRole('group', { name: 'Delivery request', exact: true });
    const retry = page.getByRole('group', { name: 'Retry policy', exact: true });
    await request.getByLabel('Limit').fill('7');
    await retry.getByLabel('Retries').fill('1');
    await expect(request.getByLabel('Request URL')).toContainText('limit=7');
    await expect(retry.getByLabel('Retry schedule').locator('li')).toHaveCount(1);
    await retry.getByRole('button', { name: 'Simulate failure' }).click();
    await expect(retry.getByRole('list', { name: 'Events' })).toContainText('retries: 1');
    await expect(request.getByText(/No events yet/)).toBeVisible();
  });

  test('0.5-style unversioned consumers keep rendering, with the same playgrounds, unchanged', async ({ page }) => {
    await page.goto(`${apps.consumerLegacyA.url}/docs/components/button`);
    await expect(page.getByRole('group', { name: 'Volt UI button', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Vanta button demo' })).toBeVisible();
    await page.goto(`${apps.consumerLegacyB.url}/concepts/models`);
    await expect(page.getByRole('group', { name: 'Delivery request', exact: true })).toBeVisible();
  });
});
