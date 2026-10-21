import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { apps, expect, test } from './fixtures.ts';

const dialogOf = (page: Page) => page.getByRole('dialog', { name: 'Search documentation' });
const openSearch = async (page: Page) => {
  await page.getByRole('button', { name: 'Search', exact: false }).first().click();
  await expect(dialogOf(page)).toBeVisible();
  return dialogOf(page);
};
const searchFor = async (page: Page, phrase: string) => {
  const dialog = await openSearch(page);
  await dialog.getByRole('searchbox', { name: 'Search the documentation' }).fill(phrase);
  return dialog;
};
const headingTop = (page: Page, id: string) =>
  page.evaluate((target) => Math.round(document.getElementById(target)!.getBoundingClientRect().top), id);

test.describe('E2E-012 full-text search', () => {
  test('finds a phrase that only exists in the Markdown body and opens the section', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.goto(`${apps.a.url}/docs/overview`);
    // "lantern-cobalt-ledger" is in no title, description or heading: only the body of the accessibility guide has it.
    const dialog = await searchFor(page, 'lantern cobalt ledger');
    const result = dialog.getByRole('link', { name: /Accessibility/ });
    await expect(result).toHaveCount(1);
    await expect(result).toHaveAttribute('href', '/docs/guides/accessibility#checklist');
    await expect(result).toContainText('Checklist');
    await expect(dialog.locator('mark').first()).toBeVisible();
    await result.click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(`${apps.a.url}/docs/guides/accessibility#checklist`);
    await expect(page.locator('#checklist')).toBeInViewport();
    await expect.poll(() => headingTop(page, 'checklist')).toBeLessThan(120);
    await expect(page.locator('.doq-toc a.is-active')).toHaveText('Checklist');
    await expect(page.locator('nav.doq-sidebar .doq-nav-link.is-active')).toHaveText('Accessibility');
    await expect(page.locator('#checklist')).toBeFocused();
  });

  test('a custom nested slug is the public result URL, not the source filename', async ({ page }) => {
    await page.goto(`${apps.b.url}/docs/concepts/models`);
    const dialog = await searchFor(page, 'environment credentials out of browser bundles');
    const result = dialog.getByRole('link', { name: /Getting started/ }).first();
    await expect(result).toHaveAttribute('href', '/docs/onboarding/first-application#create-a-workspace');
    await expect(dialog.locator('a[href*="getting-started"]')).toHaveCount(0);
    await result.click();
    await expect(page).toHaveURL(`${apps.b.url}/docs/onboarding/first-application#create-a-workspace`);
    await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeVisible();
    await expect(page.locator('#create-a-workspace')).toBeInViewport();
  });

  test('keyboard: Ctrl+K opens, arrows move through results, Enter opens, Escape restores focus', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/overview`);
    const trigger = page.getByRole('button', { name: /^Search/ });
    await page.keyboard.press('Control+k');
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    const input = dialog.getByRole('searchbox');
    await expect(input).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Meta+k');
    await expect(dialog).toBeVisible();
    await input.fill('focus');
    const links = dialog.getByRole('link');
    await expect(links.first()).toBeVisible();
    expect(await links.count()).toBeGreaterThan(1);
    await page.keyboard.press('ArrowDown');
    await expect(links.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(links.nth(1)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(input).toBeFocused();
    await page.keyboard.press('ArrowDown');
    const target = await links.first().getAttribute('href');
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(`${apps.a.url}${target}`);
  });

  test('Enter in the search field opens the first result', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/overview`);
    const dialog = await searchFor(page, 'lantern cobalt ledger');
    await expect(dialog.getByRole('link')).toHaveCount(1);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/docs\/guides\/accessibility#checklist$/);
  });

  test('the shortcut is not claimed on host pages or inside other text fields', async ({ page }) => {
    await page.goto(apps.a.url);
    const prevented = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });
      document.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(prevented).toBe(false);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.goto(`${apps.a.url}/docs/overview`);
    await page.evaluate(() => {
      const field = document.createElement('input');
      field.id = 'host-field';
      document.body.appendChild(field);
      field.focus();
    });
    await page.keyboard.press('Control+k');
    await expect(dialogOf(page)).toBeHidden();
  });

  test('empty, unavailable and clear states', async ({ page }) => {
    await page.goto(`${apps.b.url}/docs/concepts/models`);
    const dialog = await openSearch(page);
    await expect(dialog.getByRole('status')).toHaveText('Type to search the documentation.');
    await dialog.getByRole('searchbox').fill('zzzqqqnotpresent');
    await expect(dialog.getByRole('status')).toHaveText('No results for “zzzqqqnotpresent”.');
    await expect(dialog.getByRole('link')).toHaveCount(0);
    await dialog.getByRole('searchbox').fill('');
    await expect(dialog.getByRole('status')).toHaveText('Type to search the documentation.');
  });

  test('result text is plain text, never raw HTML', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/overview`);
    // The forms guide documents <label> and <input> markup in a code block; those words must surface as text.
    const dialog = await searchFor(page, 'label for email');
    await expect(dialog.getByRole('link').first()).toBeVisible();
    const tags = await dialog
      .locator('.doq-search-results *')
      .evaluateAll((els) => els.map((el) => el.tagName.toLowerCase()));
    expect(tags.filter((tag) => !['li', 'a', 'span', 'mark'].includes(tag))).toEqual([]);
  });

  test('a missing search index shows an unavailable state and the page keeps working', async ({ page, problems }) => {
    await page.route('**/pagefind/pagefind.js', (route) => route.fulfill({ status: 404, body: 'Not found' }));
    await page.goto(`${apps.a.url}/docs/overview`);
    const dialog = await searchFor(page, 'button');
    await expect(dialog.getByRole('status')).toContainText('Search is unavailable');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('navigation', { name: 'Vanta UI docs' }).getByRole('link', { name: 'Installation' }).click();
    await expect(page).toHaveURL(/\/docs\/installation$/);
    // The missing bundle is logged by the browser as a failed 404 module load; nothing else may be reported.
    expect(problems.splice(0)).toEqual([
      'console.error: Failed to load resource: the server responded with a status of 404 (Not Found)',
      `requestfailed: ${apps.a.url}/pagefind/pagefind.js net::ERR_ABORTED`,
    ]);
  });
});

test.describe('E2E-012 search accessibility', () => {
  for (const [name, url, query] of [
    ['Showcase A (dark)', `${apps.a.url}/docs/overview`, 'lantern cobalt ledger'],
    ['Showcase B (light)', `${apps.b.url}/docs/concepts/models`, 'environment credentials'],
  ] as const) {
    test(`${name}: the open dialog has an accessible name, labelled field and no serious axe violations`, async ({
      page,
    }) => {
      await page.goto(url);
      const dialog = await searchFor(page, query);
      await expect(dialog.getByRole('link').first()).toBeVisible();
      await expect(dialog.getByRole('search')).toBeVisible();
      await expect(dialog.getByRole('searchbox', { name: 'Search the documentation' })).toBeVisible();
      await expect(dialog.getByRole('status')).toHaveText(/\d+ results?/);
      const results = await new AxeBuilder({ page }).include('dialog[open]').withTags(['wcag2a', 'wcag2aa']).analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
      // The modal dialog makes the page behind it inert: Tab may leave for the browser UI, never for page content.
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Tab');
        expect(
          await page.evaluate(
            () => document.activeElement === document.body || !!document.activeElement?.closest('dialog'),
          ),
        ).toBe(true);
      }
    });
  }
});

test.describe('E2E-013 search on mobile and across host themes', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const [name, app, url, query, expected] of [
    ['Showcase A', apps.a.url, '/docs/overview', 'lantern cobalt ledger', '/docs/guides/accessibility#checklist'],
    [
      'Showcase B (right drawer)',
      apps.b.url,
      '/docs/concepts/models',
      'environment credentials browser bundles',
      '/docs/onboarding/first-application#create-a-workspace',
    ],
  ] as const) {
    test(`${name}: search is usable at 375px and lands on the section`, async ({ page }) => {
      await page.goto(`${app}${url}`);
      const trigger = page.getByRole('button', { name: /^Search/ });
      await expect(trigger).toBeVisible();
      const box = (await trigger.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(40);
      const dialog = await searchFor(page, query);
      const result = dialog.getByRole('link').first();
      await expect(result).toBeVisible();
      const dialogBox = (await dialog.boundingBox())!;
      expect(dialogBox.x).toBeGreaterThanOrEqual(0);
      expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(375);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await result.click();
      await expect(page).toHaveURL(`${app}${expected}`);
      await expect(dialog).toBeHidden();
      await expect(page.locator(`#${expected.split('#')[1]}`)).toBeInViewport();
    });
  }

  test('the dialog follows the host theme in Showcase A (dark and light) and Showcase B (light)', async ({ page }) => {
    const surface = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.goto(`${apps.a.url}/docs/overview`);
    await openSearch(page);
    const dark = await surface('.doq-search-dialog');
    expect(dark).toBe(await surface('.doq-root'));
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await openSearch(page);
    const light = await surface('.doq-search-dialog');
    expect(light).toBe(await surface('.doq-root'));
    expect(light).not.toBe(dark);

    await page.goto(`${apps.b.url}/docs/concepts/models`);
    await openSearch(page);
    const forge = await surface('.doq-search-dialog');
    expect(forge).toBe(await surface('.doq-root'));
    expect(forge).not.toBe(dark);
  });
});
