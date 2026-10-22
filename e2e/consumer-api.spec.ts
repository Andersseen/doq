import { expect, test, apps } from './fixtures.ts';

// The packed @doqs/analog tarball installed outside the monorepo (scripts/consumer.ts): the generated pages were checked
// and regenerated through the installed `doq-api` binary with the consumer's own TypeScript before this build.
test.describe('E2E-094 packed consumers: API reference', () => {
  test('embedded consumer (documentation under /docs): reference pages, search and hydration', async ({ page }) => {
    const alert = `${apps.consumerA.url}/docs/reference/generated/vanta-alert-component`;
    await page.goto(alert);
    await expect(page.getByRole('heading', { level: 1, name: 'VantaAlertComponent' })).toBeVisible();
    await expect(
      page.locator('.doq-markdown table').first().locator('tbody tr', { hasText: 'alertTitle' }),
    ).toContainText('property heading');
    await expect(page.locator('.doq-markdown table').first().getByRole('link', { name: 'VantaTone' })).toHaveAttribute(
      'href',
      '/docs/reference/generated/vanta-tone',
    );
    await page.reload();
    await expect(page.locator('body[ngh], [ng-version]').first()).toBeAttached();
    await page.getByRole('button', { name: 'Search', exact: false }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Search documentation' });
    await dialog.getByRole('searchbox', { name: 'Search the documentation' }).fill('vantaTooltipDelay');
    await expect(dialog.getByRole('link', { name: /VantaTooltipDirective/ }).first()).toHaveAttribute(
      'href',
      /^\/docs\/reference\/generated\/vanta-tooltip-directive(#|$)/,
    );
    // The consumer's own Angular demo and host styling still work next to generated pages.
    await page.keyboard.press('Escape');
    await page.goto(`${apps.consumerA.url}/docs/components/button`);
    await expect(page.getByRole('region', { name: 'Vanta button demo' })).toBeVisible();
  });

  test('root consumer (docs-first): reference pages, canonical links and search', async ({ page }) => {
    await page.goto(`${apps.consumer.url}/reference/generated/create-forge-client`);
    await expect(page.getByRole('heading', { level: 1, name: 'createForgeClient' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Overload 1', 'Overload 2']);
    await expect(page.getByRole('link', { name: 'ForgeClient', exact: true }).first()).toHaveAttribute(
      'href',
      '/reference/generated/forge-client',
    );
    await page.getByRole('button', { name: 'Search', exact: false }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Search documentation' });
    await dialog.getByRole('searchbox', { name: 'Search the documentation' }).fill('RateLimited');
    await expect(dialog.getByRole('link', { name: /ForgeErrorCode/ }).first()).toHaveAttribute(
      'href',
      /^\/reference\/generated\/forge-error-code(#|$)/,
    );
  });
});
