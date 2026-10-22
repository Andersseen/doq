import AxeBuilder from '@axe-core/playwright';
import { apps, expect, test } from './fixtures.ts';

const installCommand = 'pnpm add @doqs/analog @analogjs/content @analogjs/router prismjs';

test.describe('E2E-030 official website', () => {
  test('hero, install command and the integration example are visible', async ({ page }) => {
    await page.goto(apps.site.url);
    await expect(page).toHaveTitle(/^Doqs/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Documentation that belongs in your app.' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();
    await expect(page.getByText(installCommand)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(4);
    await expect(page.locator('pre', { hasText: 'doqPrerenderRoutes' }).first()).toBeVisible();
  });

  test('header navigation scrolls to the sections', async ({ page }) => {
    await page.goto(apps.site.url);
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Getting started' }).click();
    await expect(page).toHaveURL(/#getting-started$/);
    await expect(page.getByRole('heading', { name: 'Getting started' })).toBeInViewport();
  });

  test('external links point to the repository and the npm package', async ({ page }) => {
    await page.goto(apps.site.url);
    const main = page.getByRole('navigation', { name: 'Main' });
    await expect(main.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/Andersseen/doqs',
    );
    await expect(main.getByRole('link', { name: 'npm' })).toHaveAttribute(
      'href',
      'https://www.npmjs.com/package/@doqs/analog',
    );
    const footer = page.getByRole('navigation', { name: 'Footer' });
    for (const name of ['GitHub', 'npm', 'Documentation (README)', 'MIT License'])
      await expect(footer.getByRole('link', { name })).toHaveAttribute('href', /^https:\/\//);
  });

  test('the copy button puts the exact install command on the clipboard', async ({ page }) => {
    await page.goto(apps.site.url);
    await page.getByRole('button', { name: /Copy/ }).click();
    await expect(page.getByRole('status')).toHaveText(/copied/i);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(installCommand);
  });

  test('mobile: menu works by keyboard and the page never scrolls horizontally', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(apps.site.url);
    const toggle = page.getByRole('button', { name: 'Menu' });
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Close' })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'GitHub' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
    for (const width of [320, 360, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
    }
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`axe finds no serious or critical violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(apps.site.url);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    });
  }

  test('keyboard focus is visible on links and buttons', async ({ page }) => {
    await page.goto(apps.site.url);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(outline).not.toBe('none');
  });
});
