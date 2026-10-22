import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { apps, expect, test } from './fixtures.ts';

const alert = `${apps.a.url}/docs/reference/generated/vanta-alert-component`;
const tooltip = `${apps.a.url}/docs/reference/generated/vanta-tooltip-directive`;
const client = `${apps.b.url}/reference/generated/create-forge-client`;

const searchFor = async (page: Page, phrase: string) => {
  await page.getByRole('button', { name: 'Search', exact: false }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Search documentation' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('searchbox', { name: 'Search the documentation' }).fill(phrase);
  return dialog;
};
/** Expands a navigation group (a <details>) unless it is already open. */
const openGroup = async (nav: Locator, name: string) => {
  const summary = nav.locator('summary', { hasText: new RegExp(`^\\s*${name}\\s*$`, 'i') }).first();
  if (!(await summary.evaluate((element) => element.parentElement!.hasAttribute('open')))) await summary.click();
};

test.describe('generated API reference (0.5): Showcase A, embedded under /docs', () => {
  test('E2E-080: a component reference shows its selector, required input, alias, transform and output', async ({
    page,
  }) => {
    await page.goto(alert);
    await expect(page.getByRole('heading', { level: 1, name: 'VantaAlertComponent' })).toBeVisible();
    await expect(page.locator('.doq-markdown pre', { hasText: 'vanta-alert' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'Overview',
      'Selector',
      'Inputs',
      'Outputs',
      'Public methods',
      'Related types',
      'Examples',
    ]);
    const inputs = page.locator('.doq-markdown table').first();
    await expect(inputs.locator('thead th')).toHaveText(['Input', 'Type', 'Default', 'Required', 'Description']);
    const tone = inputs.locator('tbody tr', { hasText: 'tone' }).first();
    await expect(tone.locator('td').nth(3)).toHaveText('Yes');
    await expect(tone.locator('td').nth(1).getByRole('link', { name: 'VantaTone' })).toHaveAttribute(
      'href',
      '/docs/reference/generated/vanta-tone',
    );
    const aliased = inputs.locator('tbody tr', { hasText: 'alertTitle' });
    await expect(aliased).toContainText('property heading');
    await expect(inputs.locator('tbody tr', { hasText: 'dismissible' })).toContainText('Transform booleanAttribute');
    const outputs = page.locator('.doq-markdown table').nth(1);
    await expect(outputs.locator('tbody tr')).toHaveCount(1);
    await expect(outputs).toContainText('dismissed');
    await expect(outputs).toContainText('void');
    await expect(page.locator('.doq-markdown h3')).toHaveText(['dismiss']);
  });

  test('E2E-081: a directive reference shows its selector, exportAs and a two-way model with its change output', async ({
    page,
  }) => {
    await page.goto(tooltip);
    await expect(page.getByRole('heading', { level: 1, name: 'VantaTooltipDirective' })).toBeVisible();
    await expect(page.locator('.doq-markdown pre', { hasText: '[vantaTooltip]' })).toBeVisible();
    await expect(page.locator('li', { hasText: 'Export as' })).toContainText('vantaTooltip');
    await expect(page.locator('li', { hasText: 'Stability' })).toContainText('candidate');
    const model = page.locator('.doq-markdown table').nth(1);
    await expect(model).toContainText('vantaTooltipOpen');
    await expect(model).toContainText('vantaTooltipOpenChange');
    await expect(page.getByRole('heading', { level: 2, name: 'Outputs' })).toHaveCount(0);
  });

  test('E2E-082: a hand-written guide links to the reference and back navigation returns to it', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/guides/accessibility`);
    await page.getByRole('link', { name: 'VantaAlertComponent reference' }).click();
    await expect(page).toHaveURL(alert);
    await expect(page.getByRole('heading', { level: 1, name: 'VantaAlertComponent' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: 'Accessibility' })).toBeVisible();
  });

  test('E2E-083: search finds a directive by name and opens its canonical route', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/overview`);
    const dialog = await searchFor(page, 'VantaTooltipDirective');
    const result = dialog.getByRole('link', { name: /VantaTooltipDirective/ }).first();
    await expect(result).toHaveAttribute('href', /^\/docs\/reference\/generated\/vanta-tooltip-directive(#|$)/);
    await result.click();
    await expect(page).toHaveURL(/\/docs\/reference\/generated\/vanta-tooltip-directive/);
    await expect(page.getByRole('heading', { level: 1, name: 'VantaTooltipDirective' })).toBeVisible();
  });

  test('E2E-084: search finds an input by its public (aliased) name', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/overview`);
    const dialog = await searchFor(page, 'alertTitle');
    const result = dialog.getByRole('link', { name: /VantaAlertComponent/ }).first();
    await expect(result).toHaveAttribute('href', /^\/docs\/reference\/generated\/vanta-alert-component(#|$)/);
    await page.keyboard.press('Escape');
    const selector = await searchFor(page, 'vantaTooltipDelay');
    await expect(selector.getByRole('link', { name: /VantaTooltipDirective/ }).first()).toBeVisible();
  });

  test('E2E-085: the table of contents lists the sections and follows a fragment', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.goto(alert);
    const toc = page.getByRole('complementary', { name: 'On this page' }).getByRole('link');
    await expect(toc).toHaveText([
      'Overview',
      'Selector',
      'Inputs',
      'Outputs',
      'Public methods',
      'dismiss',
      'Related types',
      'Examples',
    ]);
    await toc.nth(2).click();
    await expect(page).toHaveURL(`${alert}#inputs`);
    await expect(page.locator('#inputs')).toBeInViewport();
    await page.goto(`${alert}#examples`);
    await expect(page.locator('#examples')).toBeInViewport();
  });

  test('E2E-086: code blocks keep their language label and copy the exact example', async ({ page }) => {
    await page.goto(alert);
    const example = page.locator('.doq-markdown pre', { hasText: '<vanta-alert tone="warning"' });
    await expect(example.locator('code')).toHaveClass(/language-html/);
    const expected = await example.locator('code').innerText();
    await example.getByRole('button', { name: 'Copy code' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
    expect(expected).toContain('alertTitle="Unsaved changes"');
  });

  test('E2E-087: a nested reference route reloads with its content and hydrates cleanly', async ({ page }) => {
    await page.goto(alert);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'VantaAlertComponent' })).toBeVisible();
    await expect(page.locator('.doq-markdown table')).toHaveCount(2);
    await expect(page.locator('body')).not.toContainText('[!');
    await expect(page.locator('body[ngh], [ng-version]').first()).toBeAttached();
    await expect(page).toHaveTitle('VantaAlertComponent · Vanta UI');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /inline message/);
  });

  test('E2E-088: the sidebar moves between guides and the API reference and the index lists every symbol', async ({
    page,
  }) => {
    await page.goto(`${apps.a.url}/docs/guides/theming`);
    const nav = page.getByRole('navigation', { name: 'Vanta UI docs' });
    await openGroup(nav, 'API reference');
    await openGroup(nav, 'generated');
    await nav.getByRole('link', { name: 'VantaTooltipDirective' }).click();
    await expect(page).toHaveURL(tooltip);
    await page.goto(`${apps.a.url}/docs/reference/generated`);
    await expect(page.getByRole('heading', { level: 1, name: 'API reference' })).toBeVisible();
    for (const [heading, name] of [
      ['Components', 'VantaAlertComponent'],
      ['Directives', 'VantaTooltipDirective'],
      ['Types', 'VantaTone'],
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
      await expect(page.locator('.doq-markdown table').getByRole('link', { name })).toBeVisible();
    }
    await openGroup(nav, 'Guides');
    await nav.getByRole('link', { name: 'Theming' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Theming' })).toBeVisible();
  });

  test('E2E-089: at 375 px the drawer reaches the reference and wide tables scroll inside their block', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${apps.a.url}/docs/overview`);
    await page.getByRole('button', { name: 'Vanta UI docs menu' }).click();
    const drawer = page.getByRole('navigation', { name: 'Vanta UI docs' });
    await openGroup(drawer, 'API reference');
    await openGroup(drawer, 'generated');
    await drawer.getByRole('link', { name: 'VantaAlertComponent' }).click();
    await expect(page).toHaveURL(alert);
    await expect(page.getByRole('heading', { level: 1, name: 'VantaAlertComponent' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    const table = page.locator('.doq-markdown table').first();
    expect(await table.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    // A scrolling table must be reachable and operable with the keyboard, and have a name.
    await expect(table).toHaveAttribute('tabindex', '0');
    await expect(table).toHaveAccessibleName('Inputs table');
    await table.focus();
    await expect(table).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => table.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    const narrow = await new AxeBuilder({ page }).include('.doq-root').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(narrow.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual(
      [],
    );
  });
});

test.describe('generated API reference (0.5): Showcase B, docs-first at /', () => {
  test('E2E-090: a function reference lists every overload, its parameters and canonical type links', async ({
    page,
  }) => {
    await page.goto(client);
    await expect(page.getByRole('heading', { level: 1, name: 'createForgeClient' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Overload 1', 'Overload 2']);
    await expect(
      page.locator('.doq-markdown pre', { hasText: 'function createForgeClient(apiKey: string): ForgeClient' }),
    ).toBeVisible();
    await expect(page.locator('.doq-markdown table').first().locator('tbody tr')).toHaveCount(2);
    await expect(page.getByRole('link', { name: 'ForgeClient', exact: true }).first()).toHaveAttribute(
      'href',
      '/reference/generated/forge-client',
    );
    await expect(page.locator('.doq-root')).toHaveAttribute('data-sidebar', 'right');
    await expect(page.locator('a[href^="/docs/"]')).toHaveCount(0);
  });

  test('E2E-091: interface, alias and enum pages document members, signatures and values', async ({ page }) => {
    await page.goto(`${apps.b.url}/reference/generated/forge-error-code`);
    await expect(page.locator('.doq-markdown table tbody tr')).toHaveCount(3);
    await expect(page.locator('.doq-markdown table')).toContainText('"rate_limited"');
    await page.goto(`${apps.b.url}/reference/generated/forge-query`);
    await expect(page.locator('.doq-markdown table')).toContainText('pageSize?');
    await page.goto(`${apps.b.url}/reference/generated/forge-entry`);
    await expect(page.locator('.doq-markdown pre', { hasText: 'type ForgeEntry<' })).toContainText(
      'readonly id: string',
    );
    await page.goto(`${apps.b.url}/reference/generated/forge-client`);
    await expect(page.getByRole('heading', { level: 3 })).toHaveText(['read', 'get']);
    await expect(
      page.locator('.doq-markdown pre', { hasText: 'read<T extends Record<string, unknown>>' }),
    ).toBeVisible();
  });

  test('E2E-092: search finds a function and an enum member and keeps canonical root-relative URLs', async ({
    page,
  }) => {
    await page.goto(`${apps.b.url}/`);
    let dialog = await searchFor(page, 'createForgeClient');
    await expect(dialog.getByRole('link', { name: /createForgeClient/ }).first()).toHaveAttribute(
      'href',
      /^\/reference\/generated\/create-forge-client(#|$)/,
    );
    await page.keyboard.press('Escape');
    dialog = await searchFor(page, 'RateLimited');
    const result = dialog.getByRole('link', { name: /ForgeErrorCode/ }).first();
    await expect(result).toHaveAttribute('href', /^\/reference\/generated\/forge-error-code(#|$)/);
    await result.click();
    await expect(page.getByRole('heading', { level: 1, name: 'ForgeErrorCode' })).toBeVisible();
  });

  test('E2E-093: reference pages in both showcases pass an automated accessibility smoke in light and dark', async ({
    page,
  }) => {
    for (const url of [alert, client]) {
      for (const scheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(url);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        expect(await page.locator('h1').count()).toBe(1);
        const results = await new AxeBuilder({ page }).include('.doq-root').withTags(['wcag2a', 'wcag2aa']).analyze();
        const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(
          serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
          `${scheme} ${url}`,
        ).toEqual([]);
      }
    }
  });
});
