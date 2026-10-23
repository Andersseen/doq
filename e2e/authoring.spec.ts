import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { apps, expect, expectClipboard, nextFocusKey, test } from './fixtures.ts';

const repo = resolve(import.meta.dirname, '..');

/** The text of a `doqs:` region as an author sees it in the file: markers dropped, common indentation removed. */
function region(file: string, name: string): string {
  const lines = readFileSync(resolve(repo, file), 'utf8').split('\n');
  const start = lines.findIndex((line) => line.includes(`#region doqs:${name}`));
  const end = lines.findIndex((line) => line.includes(`#endregion doqs:${name}`));
  expect(start, `region ${name} in ${file}`).toBeGreaterThanOrEqual(0);
  const body = lines.slice(start + 1, end).filter((line) => !/#(end)?region doqs:/.test(line));
  const indent = Math.min(...body.filter((line) => line.trim()).map((line) => /^ */.exec(line)![0].length));
  return body.map((line) => line.slice(indent)).join('\n');
}

const guideA = `${apps.a.url}/docs/guides/source-backed-examples`;
const block = (page: Page, title: string) => page.locator('figure.doq-code', { hasText: title }).first();
const searchFor = async (page: Page, phrase: string) => {
  await page.getByRole('button', { name: 'Search', exact: false }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Search documentation' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('searchbox', { name: 'Search the documentation' }).fill(phrase);
  return dialog;
};

test.describe('E2E-120 source-backed authoring: embedded documentation (Showcase A)', () => {
  test('AUTHOR-001/002: the page shows the selected source region, without markers', async ({ page }) => {
    await page.goto(guideA);
    await expect(page.getByRole('heading', { level: 1, name: 'Source-backed examples' })).toBeVisible();
    const figure = block(page, 'vanta-alert.component.ts');
    await expect(figure.locator('figcaption')).toHaveText('vanta-alert.component.ts');
    const shown = await figure.locator('pre code').innerText();
    expect(shown.trimEnd()).toBe(region('apps/showcase-a/vanta-ui/src/vanta-alert.component.ts', 'alert-inputs'));
    expect(shown).not.toContain('#region');
    await expect(figure.locator('pre')).toHaveAttribute('data-language', 'ts');
    await expect(page.getByRole('link', { name: 'View source' }).first()).toHaveAttribute('href', /#L21-L28$/);
  });

  test('AUTHOR-003/015: copy writes exactly the displayed code and works from the keyboard', async ({ page }) => {
    await page.goto(guideA);
    const figure = block(page, 'vanta-alert.component.ts');
    const expected = await figure.locator('pre code').innerText();
    const copy = figure.getByRole('button', { name: 'Copy code' });
    await copy.focus();
    await expect(copy).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(figure.getByRole('button', { name: 'Code copied' })).toHaveText('Copied');
    await expectClipboard(page, expected);
    await page.keyboard.press(nextFocusKey(page));
    await expect(figure.locator('button.doq-code-copy')).not.toBeFocused();
  });

  test('AUTHOR-004: a guide links to the generated API page of the symbol', async ({ page }) => {
    await page.goto(guideA);
    await page.locator('.doq-markdown').getByRole('link', { name: 'VantaAlertComponent' }).first().click();
    await expect(page).toHaveURL(`${apps.a.url}/docs/reference/generated/vanta-alert-component`);
    await expect(page.getByRole('heading', { level: 1, name: 'VantaAlertComponent' })).toBeVisible();
  });

  test('AUTHOR-005: an archived guide links to the archived API page, never the current one', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/v/1/legacy/alerts`);
    const link = page.locator('.doq-markdown').getByRole('link', { name: 'VantaAlertComponent' }).first();
    await expect(link).toHaveAttribute('href', '/docs/v/1/reference/generated/vanta-alert-component');
    await link.click();
    await expect(page).toHaveURL(`${apps.a.url}/docs/v/1/reference/generated/vanta-alert-component`);
    await expect(page.locator('.doq-markdown')).toContainText('kind');
    await expect(page.locator('.doq-markdown')).not.toContainText('alertTitle');
  });

  test('AUTHOR-006/007: the shared fragment renders in place with working heading anchors and TOC entry', async ({
    page,
  }) => {
    await page.goto(guideA);
    const heading = page.getByRole('heading', { level: 2, name: 'Set up the library' });
    await expect(heading).toHaveAttribute('id', 'set-up-the-library');
    await expect(page.locator('.doq-callout[data-callout="note"]').first()).toContainText('one shared fragment');
    const toc = page.getByRole('complementary', { name: 'On this page' });
    await toc.getByRole('link', { name: 'Set up the library' }).click();
    await expect(page).toHaveURL(/#set-up-the-library$/);
    const order = await page.locator('.doq-markdown h2').allInnerTexts();
    expect(order).toEqual(['Set up the library', 'Alert inputs', 'A line range', 'Source next to a live component']);
  });

  test('AUTHOR-008/009/010: a playground next to its source controls the real component and survives navigation', async ({
    page,
  }) => {
    await page.goto(guideA);
    await expect(block(page, 'button-playground.ts')).toContainText('VantaButtonPlaygroundComponent');
    const playground = page.getByRole('group', { name: 'Volt UI button', exact: true });
    const button = playground.locator('.doq-pg-frame button[voltbutton]');
    await playground.getByLabel('Variant').selectOption('Outline');
    await expect(button).toHaveAttribute('data-variant', 'outline');
    await playground.getByLabel('Label').fill('Publish');
    await expect(button).toHaveText('Publish');
    await page.getByRole('navigation', { name: 'Vanta UI docs' }).getByRole('link', { name: 'Theming' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Theming' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: 'Source-backed examples' })).toBeVisible();
    const again = page.getByRole('group', { name: 'Volt UI button', exact: true });
    await expect(again.locator('.doq-pg-frame button[voltbutton]')).toHaveText('Save changes');
    for (const pre of await page.locator('.doq-markdown pre').all())
      await expect(pre.locator('button.doq-code-copy')).toHaveCount(1);
  });

  test('AUTHOR-011: no authoring syntax reaches the production HTML', async ({ request }) => {
    for (const url of [guideA, `${apps.a.url}/docs/v/1/legacy/alerts`]) {
      const html = await (await request.get(url)).text();
      expect(html).not.toMatch(/::source|::include|\[\[api:|not resolved|doq content/);
      expect(html).toContain('<h1');
    }
  });

  test('AUTHOR-012/013: Pagefind finds the guide and links to its canonical route', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/overview`);
    const dialog = await searchFor(page, 'Change the source and regenerate');
    const result = dialog.getByRole('link', { name: /Source-backed examples/ }).first();
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute('href', /^\/docs\/guides\/source-backed-examples(#[\w-]+)?$/);
  });

  test('AUTHOR-014: at 320 px the page does not overflow and long code scrolls inside its block', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(guideA);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const pre = block(page, 'button-playground.ts').locator('pre');
    const metrics = await pre.evaluate((node) => ({
      scroll: node.scrollWidth,
      client: node.clientWidth,
      overflowX: getComputedStyle(node).overflowX,
    }));
    expect(metrics.scroll).toBeGreaterThan(metrics.client);
    expect(['auto', 'scroll']).toContain(metrics.overflowX);
  });

  test('AUTHOR-016: no accessibility violation in the light and the dark theme', async ({ page }) => {
    await page.goto(guideA);
    for (const theme of ['Switch to light theme', 'Switch to dark theme']) {
      const toggle = page.getByRole('button', { name: theme });
      if (await toggle.count()) await toggle.click();
      const results = await new AxeBuilder({ page }).include('.doq-markdown').analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
    }
  });
});

test.describe('E2E-121 source-backed authoring: docs-first documentation (Showcase B)', () => {
  test('AUTHOR-018: nested root-mounted pages show source, include the shared fragment and link the SDK reference', async ({
    page,
  }) => {
    await page.goto(`${apps.b.url}/guides/sdk/quickstart`);
    await expect(page.getByRole('heading', { level: 1, name: 'SDK quickstart' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Install the client' })).toHaveAttribute(
      'id',
      'install-the-client',
    );
    const config = block(page, 'config.ts');
    expect((await config.locator('pre code').innerText()).trimEnd()).toBe(
      region('apps/showcase-b/forge-sdk/src/config.ts', 'forge-config'),
    );
    const link = page.locator('.doq-markdown').getByRole('link', { name: 'createForgeClient' }).first();
    await expect(link).toHaveAttribute('href', '/reference/generated/create-forge-client');
    await link.click();
    await expect(page).toHaveURL(`${apps.b.url}/reference/generated/create-forge-client`);
    await expect(page.getByRole('heading', { level: 1, name: 'createForgeClient' })).toBeVisible();
  });

  test('AUTHOR-006: the same fragment appears on a second page, and the enum comes from source', async ({ page }) => {
    await page.goto(`${apps.b.url}/guides/sdk/errors`);
    await expect(page.getByRole('heading', { level: 2, name: 'Install the client' })).toBeVisible();
    await expect(block(page, 'client.ts').locator('pre code')).toContainText("RateLimited = 'rate_limited'");
    await expect(page.getByRole('link', { name: 'ForgeErrorCode' }).first()).toHaveAttribute(
      'href',
      '/reference/generated/forge-error-code',
    );
  });

  test('AUTHOR-005: the archived guide links the 1.x reference at /v/1', async ({ page }) => {
    await page.goto(`${apps.b.url}/v/1/guides/legacy-client`);
    const link = page.locator('.doq-markdown').getByRole('link', { name: 'createForgeClient' }).first();
    await expect(link).toHaveAttribute('href', '/v/1/reference/generated/create-forge-client');
    await link.click();
    await expect(page).toHaveURL(`${apps.b.url}/v/1/reference/generated/create-forge-client`);
  });

  test('AUTHOR-017: an unknown route is still a 404 and generated pages hydrate without errors', async ({
    page,
    request,
  }) => {
    expect((await request.get(`${apps.b.url}/guides/sdk/not-written`)).status()).toBe(404);
    await page.goto(`${apps.b.url}/guides/sdk/quickstart`);
    await expect(page.locator('analog-markdown, .doq-markdown').first()).toBeVisible();
  });
});

test.describe('E2E-122 source-backed authoring: the official documentation', () => {
  test('AUTHOR-020: the guide is generated from the real Doqs source and links its own API reference', async ({
    page,
  }) => {
    await page.goto(`${apps.site.url}/docs/guides/content-authoring`);
    await expect(page.getByRole('heading', { level: 1, name: 'Content authoring' })).toBeVisible();
    const marker = block(page, 'regions.mjs');
    await expect(marker.locator('pre code')).toContainText('const MARKER =');
    await expect(marker.locator('pre code')).not.toContainText('#region doqs:region-marker');
    await expect(block(page, 'DoqContentTarget').locator('pre code')).toContainText(
      'export interface DoqContentTarget',
    );
    const api = page.locator('.doq-markdown').getByRole('link', { name: 'DoqContentTarget' }).first();
    await expect(api).toHaveAttribute('href', '/docs/reference/content-api/doq-content-target');
    await api.click();
    await expect(page.getByRole('heading', { level: 1, name: 'DoqContentTarget' })).toBeVisible();
  });

  test('AUTHOR-006/020: the shared fragment appears on both generated pages and literal examples stay literal', async ({
    page,
    request,
  }) => {
    for (const path of ['/docs/guides/content-authoring', '/docs/operations/content-tooling']) {
      await page.goto(`${apps.site.url}${path}`);
      await expect(page.locator('.doq-callout[data-callout="important"]').first()).toContainText(
        'Authored pages are the source of truth',
      );
    }
    const html = await (await request.get(`${apps.site.url}/docs/guides/content-authoring`)).text();
    // The guide documents the syntax in code fences; those stay literal, and nothing is left unresolved outside them.
    expect(html).toContain('::source{file=');
    expect(html).not.toMatch(/not resolved|\[\[api:Name\]\]<\/p>/);
    const outside = html.replace(/<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>/g, '');
    expect(outside).not.toMatch(/::source\{|::include\{|\[\[api:/);
  });
});
