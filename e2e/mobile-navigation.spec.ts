import { apps, expect, test } from './fixtures.ts';

test.use({ viewport: { width: 375, height: 812 } });

const cases = [
  {
    name: 'Showcase A (sidebar left)',
    url: `${apps.a.url}/docs/overview`,
    side: 'left',
    group: 'Components',
    link: 'Button',
    target: '/docs/components/button',
  },
  {
    name: 'Showcase B (sidebar right)',
    url: `${apps.b.url}/docs/onboarding/first-application`,
    side: 'right',
    group: 'Concepts',
    link: 'Content models',
    target: '/docs/concepts/models',
  },
] as const;

test.describe('E2E-003 mobile navigation', () => {
  for (const c of cases) {
    test(`${c.name}: open, expand, navigate, close`, async ({ page }) => {
      await page.goto(c.url);
      const trigger = page.getByRole('button', { name: /menu$/i });
      const drawer = page.locator('nav.doq-sidebar');
      await expect(page.locator('.doq-root')).toHaveAttribute('data-sidebar', c.side);
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(drawer).not.toHaveClass(/is-open/);

      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(drawer).toHaveClass(/is-open/);
      await expect(drawer.locator(':focus')).toHaveCount(1); // focus moved into the drawer

      await drawer.getByText(c.group, { exact: true }).click();
      await drawer.getByRole('link', { name: c.link }).click();
      await expect(page).toHaveURL(`${new URL(c.url).origin}${c.target}`);
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      // Focus must not stay inside the now-hidden drawer, and must not fall back to <body>: it moves to the new article.
      await expect(drawer.locator(':focus')).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1, name: c.link })).toBeFocused();
      expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
      await expect(page.getByRole('heading', { level: 1 })).toHaveAttribute('tabindex', '-1');
    });

    test(`${c.name}: the heading focus target adds no tab stop and the hidden drawer is not tabbable`, async ({
      page,
    }) => {
      await page.goto(c.url);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const hiddenLinks = page.locator('nav.doq-sidebar a');
      await expect(hiddenLinks.first()).toBeHidden();
      const stops: string[] = [];
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        stops.push(
          await page.evaluate(
            () =>
              document.activeElement?.tagName.toLowerCase() +
              ':' +
              (document.activeElement?.textContent ?? '').trim().slice(0, 20),
          ),
        );
      }
      expect(stops.some((stop) => stop.startsWith('h1'))).toBe(false);
      expect(await page.evaluate(() => !!document.activeElement?.closest('nav.doq-sidebar'))).toBe(false);
    });

    test(`${c.name}: the Close button closes the drawer and returns focus to the trigger`, async ({ page }) => {
      await page.goto(c.url);
      const trigger = page.getByRole('button', { name: /menu$/i });
      await trigger.click();
      await page.getByRole('button', { name: 'Close navigation' }).click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger).toBeFocused();
    });

    test(`${c.name}: Escape closes the drawer and restores focus`, async ({ page }) => {
      await page.goto(c.url);
      const trigger = page.getByRole('button', { name: /menu$/i });
      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger).toBeFocused();
    });
  }
});
