import { apps, expect, test } from './fixtures.ts';

const button = `${apps.a.url}/docs/components/button`;

test.describe('E2E-004 table of contents', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 });
  });

  test('links point at real headings and following one updates the URL fragment', async ({ page }) => {
    await page.goto(button);
    const links = page.getByRole('complementary', { name: 'On this page' }).getByRole('link');
    await expect(links).toHaveText(['Choose a style', 'Example', 'Behavior']);
    for (const href of await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')!))) {
      await expect(page.locator(`.doq-markdown ${href.slice(href.indexOf('#'))}`)).toHaveCount(1);
    }
    await links.nth(1).click();
    await expect(page).toHaveURL(`${button}#example`);
  });

  test('the active heading follows the reader while scrolling', async ({ page }) => {
    await page.goto(button);
    const links = page.getByRole('complementary', { name: 'On this page' }).getByRole('link');
    for (const [index, id] of ['choose-a-style', 'example', 'behavior'].entries()) {
      await page.evaluate((target) => document.getElementById(target)!.scrollIntoView({ block: 'start' }), id);
      await expect(links.nth(index)).toHaveClass(/is-active/);
      await expect(page.locator('.doq-toc a.is-active')).toHaveCount(1);
    }
  });

  test('the TOC still works after navigating away and back', async ({ page }) => {
    await page.goto(button);
    await page.locator('a.volt-brand').click();
    await expect(page.locator('.landing-a')).toBeVisible();
    await page.goBack();
    const links = page.getByRole('complementary', { name: 'On this page' }).getByRole('link');
    await expect(links).toHaveCount(3);
    await page.evaluate(() => document.getElementById('behavior')!.scrollIntoView({ block: 'start' }));
    await expect(links.last()).toHaveClass(/is-active/);
  });

  // Known gap found while writing this suite: the TOC updates the URL fragment but nothing scrolls to it, because
  // neither Doq nor the showcase routers enable Angular's anchorScrolling. The scripted CDP harness cannot see this
  // (its click scrolls the link itself into view). test.fail() turns into a failure once the behavior is fixed.
  test('clicking a TOC link scrolls its heading into view', async ({ page }) => {
    test.fail(
      true,
      'Known gap: fragment navigation does not scroll (see docs/specs/0001-oss-sdd-testing-foundation/verification.md)',
    );
    await page.goto(button);
    await page.evaluate(() => (document.querySelectorAll('.doq-toc a')[2] as HTMLElement).click());
    await expect(page).toHaveURL(`${button}#behavior`);
    await expect(page.locator('#behavior')).toBeInViewport();
  });

  test('Showcase B has no table of contents because its host disabled it', async ({ page }) => {
    await page.goto(`${apps.b.url}/docs/concepts/models`);
    await expect(page.getByRole('heading', { level: 1, name: 'Content models' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'On this page' })).toHaveCount(0);
  });
});
