import { apps, expect, test } from './fixtures.ts';

const viewports = [
  { name: 'mobile', width: 375, height: 812, drawer: true },
  { name: 'tablet', width: 768, height: 1024, drawer: false },
  { name: 'desktop', width: 1280, height: 800, drawer: false },
  { name: 'wide', width: 1920, height: 1080, drawer: false },
] as const;

const pages = [
  { name: 'Showcase A', url: `${apps.a.url}/docs/guides/routing`, side: 'left' },
  { name: 'Showcase B', url: `${apps.b.url}/onboarding/first-application`, side: 'right' },
] as const;

test.describe('E2E-009 responsive smoke', () => {
  for (const app of pages) {
    for (const vp of viewports) {
      test(`${app.name} at ${vp.name} (${vp.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(app.url);
        const article = page.locator('.doq-article');
        await expect(article).toBeVisible();

        // No page-level horizontal overflow, and long code stays inside the article.
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, 'horizontal page overflow in px').toBeLessThanOrEqual(0);
        const articleBox = (await article.boundingBox())!;
        for (const pre of await page.locator('.doq-markdown pre').all()) {
          const box = await pre.boundingBox();
          if (!box) continue; // code in an inactive tab panel is not rendered
          expect(box.x + box.width).toBeLessThanOrEqual(articleBox.x + articleBox.width + 1);
        }

        const nav = page.locator('nav.doq-sidebar');
        const trigger = page.getByRole('button', { name: /menu$/i });
        if (vp.drawer) {
          await expect(nav).toBeHidden();
          await expect(trigger).toBeVisible();
        } else {
          await expect(nav).toBeVisible();
          await expect(trigger).toBeHidden();
          const navBox = (await nav.boundingBox())!;
          // The sidebar sits on the configured side of the article.
          if (app.side === 'left') expect(navBox.x + navBox.width).toBeLessThanOrEqual(articleBox.x + 1);
          else expect(navBox.x).toBeGreaterThanOrEqual(articleBox.x + articleBox.width - 1);
        }
      });
    }
  }

  test('crossing the mobile breakpoint swaps drawer and sidebar without a reload', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(pages[0].url);
    await expect(page.locator('nav.doq-sidebar')).toBeVisible();
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('nav.doq-sidebar')).toBeHidden();
    await expect(page.getByRole('button', { name: /menu$/i })).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('nav.doq-sidebar')).toBeVisible();
  });
});
