import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { apps, expect, test, expectClipboard, nextFocusKey } from './fixtures.ts';

const install = `${apps.a.url}/docs/installation`;
const accessibility = `${apps.a.url}/docs/guides/accessibility`;
const button = `${apps.a.url}/docs/components/button`;
const started = `${apps.b.url}/onboarding/first-application`;
const environments = `${apps.b.url}/guides/environments`;
const api = `${apps.b.url}/reference/api`;

const searchFor = async (page: Page, phrase: string) => {
  await page.getByRole('button', { name: 'Search', exact: false }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Search documentation' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('searchbox', { name: 'Search the documentation' }).fill(phrase);
  return dialog;
};
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.describe('rich Markdown authoring (0.4)', () => {
  test('E2E-060: a page with callout, tabs, steps and code renders every block once', async ({ page }) => {
    await page.goto(install);
    await expect(page.getByRole('heading', { level: 1, name: 'Installation' })).toBeVisible();
    await expect(page.getByRole('note')).toHaveCount(2);
    await expect(page.getByRole('tablist', { name: 'Package manager' }).getByRole('tab')).toHaveText([
      'npm',
      'pnpm',
      'yarn',
    ]);
    await expect(page.locator('.doq-steps > ol > li')).toHaveCount(3);
    await expect(page.locator('body')).not.toContainText(':::');
    await expect(page.locator('body')).not.toContainText('[!NOTE]');
    await expect(page.locator('.doq-steps ol')).toHaveCSS('list-style-type', 'decimal');
  });

  test('E2E-061: tabs follow the keyboard pattern with arrows, Home and End', async ({ page }) => {
    await page.goto(install);
    const tabs = page.getByRole('tablist', { name: 'Package manager' }).getByRole('tab');
    await tabs.first().focus();
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toContainText('pnpm dlx voltui add button');
    await page.keyboard.press('End');
    await expect(tabs.nth(2)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.first()).toBeFocused();
    await page.keyboard.press('Home');
    await expect(tabs.first()).toBeFocused();
    // One tab stop: Tab leaves the strip for the active panel, then the panel's copy button.
    await page.keyboard.press(nextFocusKey(page));
    await expect(page.getByRole('tabpanel')).toBeFocused();
    await page.keyboard.press(nextFocusKey(page));
    await expect(page.getByRole('tabpanel').getByRole('button', { name: 'Copy code' })).toBeFocused();
  });

  test('E2E-062: copying after a tab switch copies the active code', async ({ page }) => {
    await page.goto(install);
    await page.getByRole('tab', { name: 'yarn' }).click();
    // A click before hydration is replayed by Angular afterwards: wait for the tab state instead of racing it.
    await expect(page.getByRole('tab', { name: 'yarn' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tabpanel').getByRole('button', { name: 'Copy code' }).click();
    await expectClipboard(page, 'yarn dlx voltui add button\n');
    await page.getByRole('tab', { name: 'npm', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'npm', exact: true })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tabpanel').getByRole('button', { name: 'Copy code' }).click();
    await expectClipboard(page, 'npx voltui add button\n');
  });

  test('E2E-063: a callout keeps nested lists, links and inline code', async ({ page }) => {
    await page.goto(accessibility);
    const warning = page.locator('[data-callout="warning"]');
    await expect(warning).toHaveAttribute('role', 'note');
    await expect(warning.locator('li')).toHaveCount(3);
    await expect(warning.locator('code').first()).toHaveText('outline: none');
    await expect(warning.getByRole('link', { name: 'theme guide' })).toHaveAttribute('href', '/docs/guides/theming');
    await expect(page.locator('blockquote')).toHaveCount(0);
  });

  test('E2E-064: steps with code stay inside a 375px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const url of [install, environments]) {
      await page.goto(url);
      await expect(page.locator('.doq-steps > ol > li').first()).toBeVisible();
      expect(await overflow(page)).toBeLessThanOrEqual(0);
      const list = (await page.locator('.doq-steps').boundingBox())!;
      expect(list.x).toBeGreaterThanOrEqual(0);
      expect(list.x + list.width).toBeLessThanOrEqual(375);
      for (const pre of await page.locator('.doq-steps pre').all()) {
        const box = (await pre.boundingBox())!;
        expect(box.x + box.width).toBeLessThanOrEqual(376);
      }
    }
  });

  test('E2E-065: callouts, code tabs and inline demos share one article', async ({ page }) => {
    await page.goto(accessibility);
    const demo = page.getByRole('region', { name: 'Vanta contrast checker' });
    await expect(demo).toHaveCount(1);
    await expect(page.getByRole('note')).toHaveCount(3);
    await demo.getByLabel('Text').fill('#000000');
    await expect(demo).toContainText('Contrast');
    await page.goto(button);
    await expect(page.getByRole('tablist', { name: 'Usage' }).getByRole('tab')).toHaveText([
      'save.component.html',
      'save.component.ts',
    ]);
    await page.getByRole('tab', { name: 'save.component.ts' }).click();
    await expect(page.getByRole('tabpanel')).toContainText('export class SaveComponent');
    await expect(page.getByRole('note')).toHaveCount(1);
  });

  test('E2E-066: the table of contents navigates across rich content', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(install);
    await page.locator('.doq-toc').getByRole('link', { name: 'Add your first component' }).click();
    await expect(page).toHaveURL(`${install}#add-your-first-component`);
    await expect(page.locator('#add-your-first-component')).toBeInViewport();
    await expect(page.locator('.doq-toc a.is-active')).toHaveText('Add your first component');
    const ids = await page.locator('.doq-markdown :is(h2,h3)[id]').evaluateAll((nodes) => nodes.map((node) => node.id));
    const toc = await page.locator('.doq-toc a').evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim()));
    expect(toc).toHaveLength(ids.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('E2E-067: fragments work on load, after client navigation and after Back', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(`${install}#add-your-first-component`);
    await expect(page.locator('#add-your-first-component')).toBeInViewport();
    await page.getByRole('navigation', { name: 'Vanta UI docs' }).getByText('Guides').click();
    await page.getByRole('navigation', { name: 'Vanta UI docs' }).getByRole('link', { name: 'Accessibility' }).click();
    await expect(page).toHaveURL(accessibility);
    await page.locator('.doq-toc').getByRole('link', { name: 'Checklist' }).click();
    await expect(page).toHaveURL(`${accessibility}#checklist`);
    await expect(page.locator('#checklist')).toBeInViewport();
    await page.goBack();
    await page.goBack();
    await expect(page).toHaveURL(`${install}#add-your-first-component`);
    await expect(page.locator('#add-your-first-component')).toBeInViewport();
    // Duplicate heading ids keep the suffix assigned at build time.
    await page.goto(`${accessibility}#examples-1`);
    await expect(page.locator('#examples-1')).toBeInViewport();
  });

  test('E2E-068: search finds text that only exists inside a callout', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/overview`);
    const dialog = await searchFor(page, 'unexpectedly');
    const result = dialog.getByRole('link', { name: /Accessibility/ }).first();
    await expect(result).toHaveAttribute('href', '/docs/guides/accessibility#announcements');
    await result.click();
    await expect(page).toHaveURL(/\/docs\/guides\/accessibility#announcements$/);
    await expect(page.locator('[data-callout="caution"]')).toContainText('moving focus unexpectedly');
  });

  test('E2E-069: search indexes inactive tab panels and steps but not the tab strip', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/overview`);
    let dialog = await searchFor(page, 'dlx voltui');
    await expect(dialog.getByRole('link', { name: /Installation/ }).first()).toHaveAttribute(
      'href',
      /^\/docs\/installation#/,
    );
    await page.keyboard.press('Escape');
    dialog = await searchFor(page, 'Review what was added');
    await expect(dialog.getByRole('link', { name: /Installation/ }).first()).toHaveAttribute(
      'href',
      /^\/docs\/installation#/,
    );
    await page.keyboard.press('Escape');
    // That the tab strip itself is absent from the index is asserted on the index files (CONTRACT-055).
  });

  test('E2E-070: nested and custom slugs render rich content and the source path stays 404', async ({
    page,
    request,
  }) => {
    await page.goto(started);
    await expect(page.getByRole('tablist', { name: 'Request style' }).getByRole('tab')).toHaveText([
      'TypeScript client',
      'HTTP',
    ]);
    await expect(page.locator('[data-callout="tip"]')).toBeVisible();
    expect((await request.get(`${apps.b.url}/getting-started`)).status()).toBe(404);
    await page.goto(`${apps.b.url}/guides/environments`);
    await expect(page.locator('[data-callout="warning"]')).toBeVisible();
  });

  test('E2E-071: docs-first root mount serves rich pages with the shell and its right sidebar', async ({ page }) => {
    await page.goto(apps.b.url);
    await expect(page.locator('.doq-index')).toBeVisible();
    await page
      .getByRole('link', { name: /Environments/ })
      .first()
      .click();
    await expect(page).toHaveURL(environments);
    await expect(page.locator('.doq-root[data-sidebar="right"]')).toBeVisible();
    await expect(page.locator('.doq-steps > ol > li')).toHaveCount(3);
    await page.goto(api);
    await expect(page.locator('figure.doq-code figcaption')).toHaveText('src/app/entries.ts');
    await expect(page.locator('[data-doq-demo="forge-query"]')).toHaveCount(1);
  });

  test('E2E-072: embedded docs keep the host chrome and the landing page free of Doq markup', async ({ page }) => {
    await page.goto(install);
    await expect(page.locator('.volt-site')).toBeVisible();
    await expect(page.locator('.doq-callout')).toHaveCount(2);
    await page.goto(apps.a.url);
    await expect(page.locator('.doq-root, .doq-callout, .doq-tabs')).toHaveCount(0);
  });

  test('E2E-073: callouts and tabs follow the host theme in both showcases', async ({ page }) => {
    const callout = () =>
      page
        .locator('.doq-callout')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor);
    const selected = () =>
      page
        .locator('.doq-tab[aria-selected="true"]')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor);
    const check = async (url: string, toLight: string, toDark: string, root: string, first: 'light' | 'dark') => {
      await page.goto(url);
      await expect(page.locator(root)).toHaveAttribute('data-theme', first);
      const before = [await callout(), await selected()];
      await page.getByRole('button', { name: first === 'dark' ? toLight : toDark }).click();
      await expect(page.locator(root)).toHaveAttribute('data-theme', first === 'dark' ? 'light' : 'dark');
      expect([await callout(), await selected()]).not.toEqual(before);
      const results = await new AxeBuilder({ page }).include('.doq-root').withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(
        results.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
      ).toEqual([]);
    };
    await check(install, 'Switch to light theme', 'Switch to dark theme', '.volt-site', 'dark');
    await check(started, 'Switch to light theme', 'Switch to dark theme', '.forge-site', 'light');
  });

  test('E2E-074: tabs and callouts are keyboard operable with a visible focus indicator', async ({ page }) => {
    await page.goto(install);
    const tab = page.getByRole('tab', { name: 'npm', exact: true });
    await tab.focus();
    await page.keyboard.press(nextFocusKey(page, true));
    await page.keyboard.press(nextFocusKey(page));
    await expect(tab).toBeFocused();
    const outline = await tab.evaluate((el) => ({
      style: getComputedStyle(el).outlineStyle,
      width: getComputedStyle(el).outlineWidth,
    }));
    expect(outline.style).not.toBe('none');
    expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2);
    // Space and Enter on a focused tab keep it selected rather than breaking the pattern.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('tab', { name: 'pnpm' })).toHaveAttribute('aria-selected', 'true');
    const results = await new AxeBuilder({ page }).include('.doq-root').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });

  for (const [name, width, height] of [
    ['mobile', 375, 812],
    ['tablet', 768, 1024],
    ['desktop', 1280, 800],
  ] as const) {
    test(`E2E-075: no overflow, hydration errors or exceptions on rich pages at ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      for (const url of [install, accessibility, button, started, environments, api]) {
        await page.goto(url);
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        await page.waitForLoadState('networkidle');
        expect(await overflow(page), url).toBeLessThanOrEqual(0);
      }
    });
  }

  test('E2E-076: reduced motion removes transitions from rich blocks', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(install);
    const durations = await page
      .locator('.doq-tab, .doq-callout')
      .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).transitionDuration));
    for (const duration of durations) expect(parseFloat(duration)).toBeLessThan(0.01);
  });
});
