import { expect, test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

// Compatibility smoke for one matrix cell: the packed tarball installed in a docs-first consumer (Showcase B's sources) with
// the Angular version under test. It exercises Angular integration (hydration, signals, router, zoneless change detection),
// not just that the package installs. DOQ_COMPAT_ANGULAR is the expected major version of the installed framework.
const major = process.env.DOQ_COMPAT_ANGULAR;

const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
      page.on('console', message => {
        if (message.type() === 'error' || message.type() === 'warning') problems.push(`console.${message.type()}: ${message.text()}`);
      });
      page.on('requestfailed', request => problems.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`));
      await use(problems);
      expect(problems, 'browser reported errors or warnings').toEqual([]);
    },
    { auto: true },
  ],
});

const openSearch = async (page: Page) => {
  await page.getByRole('button', { name: /^Search/ }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Search documentation' });
  await expect(dialog).toBeVisible();
  return dialog;
};

test.describe('COMPAT-01 Angular integration of the packed package', () => {
  test('runs on the Angular version under test, zoneless, and hydrates', async ({ page }) => {
    await page.goto('/onboarding/first-application');
    const version = await page.locator('[ng-version]').first().getAttribute('ng-version');
    if (major) expect(version, 'installed Angular version').toMatch(new RegExp(`^${major}\\.`));
    expect(await page.evaluate(() => typeof (window as unknown as { Zone?: unknown }).Zone), 'Zone.js must not be loaded').toBe('undefined');
    // Hydrated, not just prerendered: signal state in a consumer demo, no Zone.js to trigger change detection.
    const demo = page.getByRole('region', { name: 'Forge content model demo' });
    await demo.getByLabel('Field type').selectOption('Reference');
    await expect(demo.locator('strong')).toHaveText('Reference');
  });

  test('client navigation updates title, focus and history without a reload', async ({ page }) => {
    await page.goto('/onboarding/first-application');
    await page.evaluate(() => { (window as unknown as { __kept?: boolean }).__kept = true; });
    await page.getByRole('link', { name: 'Content models' }).first().click();
    await expect(page).toHaveURL(/\/concepts\/models$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Content models' })).toBeFocused();
    await expect(page).toHaveTitle('Content models · ForgeCMS Developers');
    await page.goBack();
    await expect(page).toHaveURL(/\/onboarding\/first-application$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(/\/concepts\/models$/);
    expect(await page.evaluate(() => (window as unknown as { __kept?: boolean }).__kept), 'a full reload happened').toBe(true);
  });

  test('rich Markdown: tabs by keyboard, callouts, steps and copy', async ({ page }) => {
    await page.goto('/onboarding/first-application');
    await expect(page.locator('[data-callout="tip"]')).toBeVisible();
    const tabs = page.getByRole('tablist', { name: 'Request style' }).getByRole('tab');
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toContainText('curl -H');
    await expect(page.getByRole('tabpanel').getByRole('button', { name: 'Copy code' })).toBeAttached();
    await page.goto('/guides/environments');
    await expect(page.locator('.doq-steps > ol > li')).toHaveCount(3);
  });

  test('search: keyboard shortcut, result navigation, fragment focus and Escape', async ({ page, browserName }) => {
    await page.goto('/concepts/models');
    await page.keyboard.press(process.platform === 'darwin' && browserName !== 'chromium' ? 'Meta+k' : 'Control+k');
    const dialog = page.getByRole('dialog', { name: 'Search documentation' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('searchbox').fill('environment credentials out of browser bundles');
    const result = dialog.getByRole('link', { name: /Getting started/ }).first();
    await expect(result).toHaveAttribute('href', '/onboarding/first-application#create-a-workspace');
    await result.click();
    await expect(page).toHaveURL(/\/onboarding\/first-application#create-a-workspace$/);
    await expect(page.locator('#create-a-workspace')).toBeFocused();
    await openSearch(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Search documentation' })).toBeHidden();
  });

  test('versions: switching keeps the page, search is filtered to the version', async ({ page }) => {
    await page.goto('/reference/api');
    const versions = page.locator('.doq-version').first();
    await versions.locator('summary').click();
    await versions.getByRole('link', { name: /1\.x/ }).click();
    await expect(page).toHaveURL(/\/v\/1\/reference\/api$/);
    const dialog = await openSearch(page);
    await dialog.getByRole('searchbox').fill('sandpiper-offset');
    await expect(dialog.getByRole('link', { name: /API reference/ })).toHaveAttribute('href', /^\/v\/1\/reference\/api#/);
  });

  test('generated API reference renders and links resolve', async ({ page }) => {
    await page.goto('/reference/generated/forge-client');
    await expect(page.getByRole('heading', { level: 1, name: 'ForgeClient' })).toBeVisible();
    await expect(page.locator('.doq-markdown table').first()).toBeVisible();
    await page.reload();
    await expect(page.locator('[ng-version]').first()).toBeAttached();
  });
});
