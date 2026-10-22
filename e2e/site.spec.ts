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
    await expect(page.locator('pre', { hasText: 'doqPaths' }).first()).toBeVisible();
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
    await page.getByRole('button', { name: /Copy install command/ }).click();
    await expect(page.locator('app-copy-command').getByRole('status')).toHaveText(/copied/i);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(installCommand);
  });

  test('mobile: the Volt drawer opens by keyboard, traps focus, closes with Escape and returns focus', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(apps.site.url);
    const toggle = page.getByRole('button', { name: 'Menu' });
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
    await toggle.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'GitHub' })).toBeVisible();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((el) => el.contains(document.activeElement)), 'focus stays inside').toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('mobile: following a drawer link closes it and scrolls to the section', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(apps.site.url);
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Interactive Markdown' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page).toHaveURL(/#interactive-markdown$/);
    await expect(page.getByRole('heading', { name: 'Interactive components in Markdown' })).toBeInViewport();
  });

  for (const width of [320, 375, 768, 1280, 1440, 1920]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(apps.site.url);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
    });
  }

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

  test('code tabs switch examples and copy exactly the visible code', async ({ page }) => {
    await page.goto(apps.site.url);
    const tabs = page.getByRole('tablist', { name: 'Setup steps' });
    await expect(tabs.getByRole('tab', { selected: true })).toHaveText('Shared paths');
    await tabs.getByRole('tab', { name: 'Analog prerender' }).click();
    const panel = page.getByRole('tabpanel');
    await expect(panel).toContainText('doqPrerenderRoutes');
    await tabs.getByRole('tab', { name: 'Angular providers' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.getByRole('tab', { name: 'Demo registration' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(panel).toContainText("'enter-animation'");
    await panel.getByRole('button', { name: /Copy/ }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(await panel.locator('pre code').innerText());
    expect(copied).toContain('defineDoqConfig');
  });

  test('the interactive Markdown demo is a working Volt + Angular Movement component', async ({ page }) => {
    await page.goto(apps.site.url);
    const group = page.getByRole('group', { name: 'Enter animation preset' });
    await group.scrollIntoViewIfNeeded();
    await group.getByRole('radio', { name: 'zoom-in' }).click();
    await expect(page.getByTestId('enter-target')).toHaveText('zoom-in');
    await expect(group.getByRole('radio', { name: 'zoom-in' })).toBeChecked();
    await page.getByRole('button', { name: 'Replay' }).click();
    await expect(page.getByTestId('enter-target')).toBeVisible();
  });

  test('reduced motion: content is visible immediately and nothing is left hidden', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(apps.site.url);
    await page.locator('#features').scrollIntoViewIfNeeded();
    for (const item of await page.locator('#features li').all()) await expect(item).toHaveCSS('opacity', '1');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  });

  test('theme: follows the system, toggles, persists, and swaps Volt tokens', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(apps.site.url);
    const html = page.locator('html');
    const toggle = page.getByRole('button', { name: 'Dark theme' });
    await expect(html).toHaveClass(/dark/);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await toggle.click();
    await expect(html).not.toHaveClass(/dark/);
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(darkBg);
    await page.reload();
    await expect(html).not.toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem('doqs-theme'))).toBe('light');
  });

  test('Volt, Lumen and Angular Movement render: tokens, icons and no hydration or console errors', async ({
    page,
  }) => {
    const problems: string[] = [];
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && problems.push(m.text()));
    page.on('pageerror', (e) => problems.push(e.message));
    await page.goto(apps.site.url);
    await expect(page.locator('html')).toHaveAttribute('data-color', 'ember');
    await expect(page.locator('html')).toHaveAttribute('data-style', 'soft');
    expect(await page.locator('volt-card').count()).toBeGreaterThanOrEqual(9);
    const icons = page.locator('lmn-arrow-right svg, lmn-github svg').first();
    await expect(icons).toBeVisible();
    await expect(icons).toHaveAttribute('aria-hidden', 'true');
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(500);
    expect(problems).toEqual([]);
  });

  test('prerendered HTML already contains the hero, features and Volt markup', async ({ request }) => {
    const html = await (await request.get(apps.site.url)).text();
    expect(html).toContain('Documentation that belongs in your app.');
    expect(html).toContain('Angular components inside Markdown');
    expect(html).toContain('<volt-card');
    expect(html).toContain('data-color="ember"');
    expect(html).toContain('doqPrerenderRoutes');
  });

  test('the primary actions and header links keep their destinations', async ({ page }) => {
    await page.goto(apps.site.url);
    await expect(page.getByRole('link', { name: 'View on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/Andersseen/doqs',
    );
    await expect(page.getByRole('link', { name: 'npm package' })).toHaveAttribute(
      'href',
      'https://www.npmjs.com/package/@doqs/analog',
    );
  });
});
