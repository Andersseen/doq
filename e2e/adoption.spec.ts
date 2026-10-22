import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { apps, expect, test } from './fixtures.ts';

// ADOPTION-01..04: a real Angular Movement checkout (Angular 22, zoneless, Tailwind 4, its own shell and
// SmoothScrollService) with a /handbook region next to its existing /docs. Built by scripts/adoption.ts.
const base = apps.adoption.url;
const intro = `${base}/handbook/introduction`;
const demo = (page: Page, name: string) => page.getByRole('region', { name });
const headingTop = (page: Page, id: string) =>
  page.evaluate((target) => Math.round(document.getElementById(target)!.getBoundingClientRect().top), id);

test.describe('E2E-050 Angular Movement adoption proof', () => {
  test('existing host routes keep working next to the handbook', async ({ page }) => {
    for (const path of ['/', '/docs/introduction', '/demos/enter']) {
      const response = await page.goto(`${base}${path}`);
      expect(response?.status(), path).toBe(200);
      await expect(page.getByRole('navigation').first()).toBeVisible();
      await expect(page.locator('.doq-root')).toHaveCount(0);
    }
    await page.goto(`${base}/docs/introduction`);
    await expect(page.getByRole('heading', { level: 1, name: 'Introduction' })).toBeVisible();
  });

  test('the handbook index and the custom-slug page are served under the chosen basePath', async ({ page }) => {
    await page.goto(`${base}/handbook`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('a[href="/handbook/reference/api-guide"]').first()).toBeVisible();
    await page.goto(`${base}/handbook/reference/api-guide`);
    await expect(page.getByRole('heading', { level: 1, name: 'API guide' })).toBeVisible();
    expect((await page.request.get(`${base}/handbook/guides/api`)).status()).not.toBe(200);
  });

  test('real Angular Movement components sit between Markdown sections and respond to input', async ({ page }) => {
    await page.goto(intro);
    const order = await page
      .locator('.doq-content')
      .evaluate((root) =>
        Array.from(root.querySelectorAll('h2[id], [data-doq-demo]')).map(
          (el) => el.getAttribute('data-doq-demo') ?? el.id,
        ),
      );
    expect(order).toEqual([
      'why-angular-movement',
      'installation',
      'install-command',
      'try-your-first-animation',
      'enter-animation',
      'usage',
      'usage-1',
    ]);
    const install = page.locator('[data-doq-demo="install-command"]');
    await install.getByRole('button', { name: 'npm', exact: true }).click();
    await expect(install.locator('code')).toContainText('npm install angular-movement');
    await expect(install.getByRole('button', { name: 'npm', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const enter = demo(page, 'Enter animation demo');
    await enter.getByLabel('Preset').selectOption('scale-in');
    await expect(enter).toContainText('Entered with scale-in (replayed 0×)');
    await enter.getByRole('button', { name: 'Replay' }).click();
    await expect(enter).toContainText('replayed 1×');
  });

  test('the host API stability table renders in the Markdown flow, and an unknown id degrades gracefully', async ({
    page,
  }) => {
    await page.goto(`${base}/handbook/reference/api-guide`);
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByText('Anything marked stable follows semantic versioning.')).toBeVisible();
    await expect(page.locator('.doq-demo-fallback')).toContainText('Demo “does-not-exist” is not registered');
    await expect(page.getByText('The page keeps working when a demo id is unknown.')).toBeVisible();
  });

  test('a directive inside a fenced block stays literal', async ({ page }) => {
    await page.goto(`${base}/handbook/get-started`);
    await expect(page.locator('.doq-markdown pre', { hasText: '::demo[this-must-stay-literal]' })).toHaveCount(1);
    await expect(page.locator('[data-doq-demo="this-must-stay-literal"]')).toHaveCount(0);
  });

  test('duplicate headings keep canonical ids and the table of contents navigates, with host smooth scrolling active', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1700, height: 800 });
    await page.goto(intro);
    const toc = page.getByRole('complementary', { name: 'On this page' }).getByRole('link');
    expect(await toc.evaluateAll((els) => els.map((el) => el.getAttribute('href')!.split('#')[1]))).toEqual([
      'why-angular-movement',
      'installation',
      'try-your-first-animation',
      'usage',
      'usage-1',
    ]);
    await toc.nth(3).click();
    await expect(page).toHaveURL(`${intro}#usage`);
    await expect.poll(() => headingTop(page, 'usage')).toBeLessThan(160);
    await page.goto(`${intro}#usage-1`);
    await expect(page.locator('#usage-1')).toBeInViewport();
    await expect.poll(() => headingTop(page, 'usage-1')).toBeLessThan(160);
    await page.goBack();
    await expect(page).toHaveURL(`${intro}#usage`);
  });

  test('the host SmoothScrollService is really driving the page (wheel is interpolated) and fragments still work', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1700, height: 500 });
    await page.goto(intro);
    await page.mouse.move(400, 300);
    await page.mouse.wheel(0, 400);
    const early = await page.evaluate(() => scrollY);
    expect(early).toBeLessThan(400);
    await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBeGreaterThan(380);
    await page.goto(`${intro}#try-your-first-animation`);
    await expect.poll(() => headingTop(page, 'try-your-first-animation')).toBeLessThan(160);
    await page
      .getByRole('navigation', { name: 'Page navigation' })
      .getByRole('link', { name: /Getting started/ })
      .click();
    await expect(page).toHaveURL(`${base}/handbook/get-started`);
    await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeFocused();
    await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBeLessThan(5);
  });

  test('client navigation destroys and recreates host components; reload does not duplicate them', async ({ page }) => {
    await page.goto(intro);
    await demo(page, 'Enter animation demo').getByRole('button', { name: 'Replay' }).click();
    await page.getByRole('navigation', { name: 'Handbook' }).getByRole('link', { name: 'Getting started' }).click();
    await expect(page).toHaveURL(`${base}/handbook/get-started`);
    await expect(page.locator('[data-doq-demo="enter-animation"]')).toHaveCount(0);
    await page.goBack();
    await expect(demo(page, 'Enter animation demo')).toContainText('replayed 0×');
    await page.reload();
    await expect(page.locator('[data-doq-demo="enter-animation"]')).toHaveCount(1);
  });

  test('search finds Markdown text from the handbook only and opens its section', async ({ page }) => {
    await page.goto(intro);
    await page.getByRole('button', { name: 'Search', exact: false }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Search documentation' });
    await dialog.getByRole('searchbox', { name: 'Search the documentation' }).fill('marmalade quartz lantern');
    const result = dialog.getByRole('link', { name: /Getting started/ }).first();
    // Not pinned to `#configure`: see the cold-build heading-id race noted in docs/guides/angular-movement-migration.md.
    await expect(result).toHaveAttribute('href', /^\/handbook\/get-started#configure(-\d+)?$/);
    await dialog.getByRole('searchbox', { name: 'Search the documentation' }).fill('Replay Entered preset');
    await expect(dialog.getByRole('link', { name: /Introduction/ })).toHaveCount(0);
  });

  test('host theme tokens drive the handbook in light and dark, and axe finds nothing serious', async ({ page }) => {
    await page.goto(intro);
    const colors = () =>
      page.evaluate(() => {
        const style = getComputedStyle(document.querySelector('.doq-root')!);
        return [
          style.getPropertyValue('--host-docs-background').trim(),
          getComputedStyle(document.body).backgroundColor,
        ];
      });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    const dark = await colors();
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    const light = await colors();
    expect(light[1]).not.toBe(dark[1]);
    for (const theme of ['dark', 'light']) {
      await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
      // The host animates colour changes, so poll until the theme transition has settled.
      await expect
        .poll(
          async () =>
            (await new AxeBuilder({ page }).include('.doq-root').analyze()).violations
              .filter((v) => v.impact === 'serious' || v.impact === 'critical')
              .map((v) => v.id),
          { message: theme, timeout: 10_000 },
        )
        .toEqual([]);
    }
  });

  test('mobile layouts have no horizontal overflow', async ({ page }) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ['/handbook/introduction', '/handbook/get-started', '/handbook/reference/api-guide']) {
        await page.goto(`${base}${path}`);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
          `${width} ${path}`,
        ).toBe(true);
      }
    }
  });
});

// E2E-100..103: API reference generated by `doq-api` from the real Angular Movement public entry point
// (scripts/adoption.ts generates it, proves `check` fails on a public API change, then builds).
const checkout = resolve(apps.adoption.root, '../../..');
const source = (file: string) => readFileSync(resolve(checkout, 'projects/movement/src/lib', file), 'utf8');
const reference = (slug: string) => `${base}/handbook/api/${slug}`;
/** Property names declared with an Angular initializer API in the source, in declaration order. */
const declared = (text: string, api: 'input' | 'output') =>
  [...text.matchAll(new RegExp(`readonly (\\w+) = ${api}(?:\\.required)?[<(]`, 'g'))].map((match) => match[1]!);

test.describe('E2E-100 Angular Movement API reference (generated from the real source)', () => {
  test('E2E-100: MoveEnterDirective lists exactly the signal inputs declared in the source', async ({ page }) => {
    const text = source('directives/move-enter.directive.ts');
    await page.goto(reference('move-enter-directive'));
    await expect(page.getByRole('heading', { level: 1, name: 'MoveEnterDirective' })).toBeVisible();
    await expect(page.locator('.doq-markdown pre', { hasText: '[moveEnter]' })).toBeVisible();
    expect(/selector: '([^']+)'/.exec(text)?.[1]).toBe('[moveEnter]');
    const names = await page
      .locator('.doq-markdown table')
      .first()
      .locator('tbody tr td:first-child code')
      .allInnerTexts();
    expect(names).toEqual(declared(text, 'input'));
    expect(names).toEqual(['moveEnter', 'moveDuration', 'moveEasing', 'moveDelay', 'moveDisabled', 'moveSpring']);
    // The transformed inputs accept `unknown` and read as the source's signal type; the page must say both.
    const duration = page.locator('.doq-markdown table tbody tr', { hasText: 'moveDuration' });
    await expect(duration).toContainText('unknown');
    await expect(duration).toContainText("optionalTimeAttribute('moveDuration')");
    await expect(duration).toContainText('number | undefined');
    await expect(page.locator('li', { hasText: 'Stability' })).toContainText(/stable/);
  });

  test('E2E-101: MoveDragDirective lists its signal inputs and outputs with payload types and experimental stability', async ({
    page,
  }) => {
    const text = source('directives/move-drag.directive.ts');
    await page.goto(reference('move-drag-directive'));
    const tables = page.locator('.doq-markdown table');
    expect(await tables.nth(0).locator('tbody tr td:first-child code').allInnerTexts()).toEqual(
      declared(text, 'input'),
    );
    const outputs = tables.nth(1).locator('tbody tr');
    expect(await outputs.locator('td:first-child code').allInnerTexts()).toEqual(declared(text, 'output'));
    await expect(outputs).toHaveCount(3);
    for (const output of await outputs.all()) await expect(output).toContainText('MoveDragEvent');
    await expect(output0Link(page)).toHaveAttribute('href', '/handbook/api/move-drag-event');
    await expect(page.locator('li', { hasText: 'Stability' })).toContainText('experimental');
  });

  test('E2E-102: provideMovement and its input type are documented and linked', async ({ page }) => {
    const text = source('providers/provide-movement.ts');
    await page.goto(reference('provide-movement'));
    await expect(page.getByRole('heading', { level: 1, name: 'provideMovement' })).toBeVisible();
    const signature = /export function provideMovement\(([^)]*)\): (\w+)/.exec(text)!;
    await expect(page.locator('.doq-markdown pre', { hasText: 'function provideMovement(' })).toContainText(
      `): ${signature[2]}`,
    );
    await expect(page.locator('.doq-markdown pre', { hasText: 'function provideMovement(' })).toContainText(
      'config?: MovementConfigInput',
    );
    await page.getByRole('link', { name: 'MovementConfigInput' }).first().click();
    await expect(page).toHaveURL(reference('movement-config-input'));
    await expect(page.getByRole('heading', { level: 2, name: 'Definition' })).toBeVisible();
    await page.goto(`${base}/handbook/api`);
    await expect(page.getByRole('heading', { level: 1, name: 'Movement API reference' })).toBeVisible();
    for (const name of ['MoveEnterDirective', 'MoveDragDirective', 'provideMovement']) {
      await expect(page.locator('.doq-markdown table').getByRole('link', { name, exact: true })).toBeVisible();
    }
  });

  test('E2E-103: reference pages are searchable, themed by the host tokens and free of serious accessibility problems', async ({
    page,
  }) => {
    await page.goto(`${base}/handbook/introduction`);
    await page.getByRole('button', { name: 'Search', exact: false }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Search documentation' });
    await dialog.getByRole('searchbox', { name: 'Search the documentation' }).fill('moveDragSnapToOrigin');
    await expect(dialog.getByRole('link', { name: /MoveDragDirective/ }).first()).toHaveAttribute(
      'href',
      /^\/handbook\/api\/move-drag-directive(#|$)/,
    );
    await page.keyboard.press('Escape');
    await page.goto(reference('move-enter-directive'));
    const tokens = await page.evaluate(() => {
      const style = getComputedStyle(document.querySelector('.doq-root')!);
      const code = getComputedStyle(document.querySelector('.doq-markdown pre')!);
      return { code: code.backgroundColor, host: style.getPropertyValue('--host-docs-code-background').trim() };
    });
    expect(tokens.host).not.toBe('');
    for (const theme of ['dark', 'light']) {
      await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
      await expect
        .poll(
          async () =>
            (await new AxeBuilder({ page }).include('.doq-root').analyze()).violations
              .filter((v) => v.impact === 'serious' || v.impact === 'critical')
              .map((v) => v.id),
          { message: theme, timeout: 10_000 },
        )
        .toEqual([]);
    }
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(reference('move-drag-directive'));
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
  });
});

const output0Link = (page: Page) =>
  page.locator('.doq-markdown table').nth(1).getByRole('link', { name: 'MoveDragEvent' }).first();

// ADOPTION-05: versioned documentation (Doqs 0.6). The archive is the real Angular Movement tag v0.9.0: its library project was
// cloned by scripts/adoption.ts and documented by the installed doq-api into src/content/handbook-v0-9. Nothing is invented.
test.describe('E2E-114 Angular Movement adoption: versioned handbook', () => {
  const archive = `${base}/handbook/v/0.9`;
  const archivedReference = (slug: string) => `${archive}/api/${slug}`;

  test('latest keeps its URLs; the v0.9.0 archive has its own index, pages and generated reference', async ({
    page,
    request,
  }) => {
    await page.goto(`${base}/handbook/introduction`);
    await expect(page.locator('.doq-version summary')).toContainText('Latest');
    await expect(page.locator('article')).toHaveAttribute('data-pagefind-filter', 'doqsVersion:latest');
    await page.goto(archive);
    await expect(page.locator('.doq-version-notice')).toContainText('v0.9.0');
    const cards = await page
      .locator('.doq-index-card')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
    expect(cards.length).toBeGreaterThan(3);
    expect(cards.every((href) => href!.startsWith('/handbook/v/0.9/'))).toBe(true);
    // The same symbol exists in both versions; `MoveTime` (generated from the latest source) does not exist in the v0.9.0 tag.
    for (const url of [reference('move-enter-directive'), archivedReference('move-enter-directive')]) {
      expect((await request.get(url)).status(), url).toBe(200);
    }
    expect((await request.get(reference('move-time'))).status()).toBe(200);
    expect((await request.get(archivedReference('move-time'))).status()).toBe(404);
  });

  test('switching versions on a shared reference page keeps the symbol; a latest-only page falls back to the index', async ({
    page,
  }) => {
    await page.goto(reference('move-enter-directive'));
    await page.locator('.doq-version summary').click();
    await page.getByRole('link', { name: /v0\.9\.0/ }).click();
    await expect(page).toHaveURL(archivedReference('move-enter-directive'));
    await expect(page.getByRole('heading', { level: 1, name: 'MoveEnterDirective' })).toBeVisible();
    await expect(page.locator('.doq-breadcrumb')).toContainText('v0.9.0');
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'MoveEnterDirective' })).toBeVisible();
    await page.goto(reference('move-time'));
    await page.locator('.doq-version summary').click();
    await page.getByRole('link', { name: /v0\.9\.0/ }).click();
    await expect(page).toHaveURL(archive);
  });

  test('a real Angular Movement demo renders inside an archived page, hydrated without errors', async ({ page }) => {
    await page.goto(`${archive}/introduction`);
    await expect(page.locator('[ng-version]').first()).toBeAttached();
    const enter = demo(page, 'Enter animation demo');
    await enter.getByLabel('Preset').selectOption('scale-in');
    await expect(enter).toContainText('Entered with scale-in');
  });

  test('search follows the version being read', async ({ page }) => {
    const searchIn = async (url: string, phrase: string) => {
      await page.goto(url);
      await page.getByRole('button', { name: 'Search', exact: false }).first().click();
      const dialog = page.getByRole('dialog', { name: 'Search documentation' });
      await dialog.getByRole('searchbox', { name: 'Search the documentation' }).fill(phrase);
      return dialog;
    };
    let dialog = await searchIn(`${archive}/introduction`, 'archive-tag-marker');
    await expect(dialog.getByRole('link', { name: /Introduction/ })).toHaveAttribute(
      'href',
      /^\/handbook\/v\/0\.9\/introduction#/,
    );
    await page.keyboard.press('Escape');
    dialog = await searchIn(`${base}/handbook/introduction`, 'archive-tag-marker');
    await expect(dialog.getByText('No results')).toBeVisible();
    await page.keyboard.press('Escape');
    dialog = await searchIn(`${archive}/introduction`, 'MoveEnterDirective');
    await expect(dialog.locator('a[href^="/handbook/api"]')).toHaveCount(0);
    await expect(dialog.locator('a[href^="/handbook/v/0.9/api/move-enter-directive"]').first()).toBeVisible();
  });
});
