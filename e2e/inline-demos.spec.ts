import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { apps, expect, test } from './fixtures.ts';

const accessibility = `${apps.a.url}/docs/guides/accessibility`;
const api = `${apps.b.url}/docs/reference/api`;
const contrast = (page: Page) => page.getByRole('region', { name: 'Vanta contrast checker' });

test.describe('E2E-040 inline Angular components in Markdown', () => {
  test('a component appears between the sections that surround it and reacts to input', async ({ page }) => {
    await page.goto(accessibility);
    const order = await page
      .locator('.doq-content')
      .evaluate((root) =>
        Array.from(root.querySelectorAll('h2[id], [data-doq-demo]')).map(
          (el) => el.getAttribute('data-doq-demo') ?? el.id,
        ),
      );
    expect(order).toEqual([
      'principles',
      'keyboard-operation',
      'focus-visibility',
      'examples',
      'vanta-contrast',
      'color-and-contrast',
      'announcements',
      'examples-1',
      'checklist',
    ]);
    const demo = contrast(page);
    await expect(demo).toContainText('passes AA');
    await demo.getByLabel('Background').fill('#777777');
    await demo.getByLabel('Text').fill('#808080');
    await expect(demo).toContainText('fails AA');
    await expect(page.getByText('After trying the pair above')).toBeVisible();
  });

  test('the second showcase renders an inline demo of its own in a different document', async ({ page }) => {
    await page.goto(api);
    const demo = page.getByRole('region', { name: 'Forge query builder' });
    await expect(demo.getByLabel('Request URL')).toHaveText('/v1/entries?collection=product-guides&limit=20');
    await demo.getByLabel('Published only').check();
    await demo.getByLabel('Limit').fill('55');
    await expect(demo.getByLabel('Request URL')).toHaveText(
      '/v1/entries?collection=product-guides&limit=55&status=published',
    );
  });

  test('a registered demo reused inline renders once next to the frontmatter demo of another page', async ({
    page,
  }) => {
    await page.goto(`${apps.b.url}/docs/concepts/models`);
    await expect(page.getByRole('region', { name: 'Forge content model demo' })).toHaveCount(1);
    await page.goto(`${apps.b.url}/docs/onboarding/first-application`);
    await expect(page.getByRole('region', { name: 'Forge content model demo' })).toHaveCount(1);
  });

  test('the directive text never reaches the page and nothing is rendered twice after a reload', async ({ page }) => {
    await page.goto(accessibility);
    await contrast(page).getByLabel('Text').fill('#000000');
    await page.reload();
    await expect(contrast(page)).toHaveCount(1);
    await expect(contrast(page)).toContainText('Contrast');
    await expect(page.locator('body')).not.toContainText('::demo[');
  });

  test('client navigation destroys the previous instance and a revisit starts from a clean state', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/installation`);
    const install = page.getByRole('region', { name: 'Vanta install command' });
    await install.getByRole('button', { name: 'npm', exact: true }).click();
    await expect(install.locator('code')).toHaveText('npm install @voltui/components');
    await page.getByRole('navigation', { name: 'Vanta UI docs' }).getByText('Guides').click();
    await page.getByRole('navigation', { name: 'Vanta UI docs' }).getByRole('link', { name: 'Accessibility' }).click();
    await expect(page).toHaveURL(accessibility);
    await expect(install).toHaveCount(0);
    await expect(contrast(page)).toHaveCount(1);
    await page.goBack();
    await expect(page).toHaveURL(`${apps.a.url}/docs/installation`);
    await expect(page.getByRole('region', { name: 'Vanta install command' })).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Vanta install command' }).locator('code')).toHaveText(
      'pnpm add @voltui/components',
    );
  });

  test('duplicate headings keep their ids across a demo and the table of contents follows them', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto(accessibility);
    const toc = page.getByRole('complementary', { name: 'On this page' }).getByRole('link');
    const hrefs = await toc.evaluateAll((els) => els.map((el) => el.getAttribute('href')!.split('#')[1]));
    expect(hrefs).toEqual([
      'principles',
      'keyboard-operation',
      'focus-visibility',
      'examples',
      'color-and-contrast',
      'announcements',
      'examples-1',
      'checklist',
    ]);
    for (const id of hrefs) await expect(page.locator(`.doq-markdown #${id}`)).toHaveCount(1);
    await toc.nth(4).click();
    await expect(page).toHaveURL(`${accessibility}#color-and-contrast`);
    await expect(page.locator('#color-and-contrast')).toBeInViewport();
    await page.goto(`${accessibility}#examples-1`);
    await expect(page.locator('#examples-1')).toBeInViewport();
    await page.goBack();
  });

  test('the Copy button belongs to Markdown code only, not to demo markup', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/installation`);
    await expect(page.locator('.doq-inline-demo .doq-code-copy')).toHaveCount(0);
    await expect(page.locator('.doq-markdown pre .doq-code-copy').first()).toBeVisible();
  });

  test('keyboard users can operate the embedded controls in document order', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/installation`);
    const install = page.getByRole('region', { name: 'Vanta install command' });
    await install.getByRole('button', { name: 'pnpm', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(install.getByRole('button', { name: 'npm', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(install.locator('code')).toHaveText('npm install @voltui/components');
  });

  test('full-text search finds text after a demo and ignores the demo controls', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/overview`);
    const dialog = page.getByRole('dialog', { name: 'Search documentation' });
    const search = async (phrase: string) => {
      if (!(await dialog.isVisible())) await page.getByRole('button', { name: 'Search', exact: false }).first().click();
      await dialog.getByRole('searchbox', { name: 'Search the documentation' }).fill(phrase);
    };
    await search('keep the ratio you measured');
    await expect(dialog.getByRole('link', { name: /Accessibility/ }).first()).toHaveAttribute(
      'href',
      /\/docs\/guides\/accessibility#/,
    );
    await search('Sample text passes AA fails AA');
    await expect(dialog.getByRole('link', { name: /Accessibility/ })).toHaveCount(0);
  });

  test('narrow viewports do not scroll horizontally and the demo has no serious accessibility violations', async ({
    page,
  }) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 800 });
      for (const url of [accessibility, api, `${apps.a.url}/docs/installation`]) {
        await page.goto(url);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
        ).toBe(true);
      }
    }
    await page.goto(accessibility);
    const results = await new AxeBuilder({ page }).include('.doq-inline-demo').analyze();
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });

  test('reduced motion and the light scheme keep the page readable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
    await page.goto(api);
    await expect(page.getByRole('region', { name: 'Forge query builder' })).toBeVisible();
    const results = await new AxeBuilder({ page }).include('.doq-inline-demo').analyze();
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
});
