import { apps, expect, test } from './fixtures.ts';

// DET-04: three views of the same document must agree: the prerendered HTML, the table of contents and the hydrated DOM, and
// the anchors the search index hands out. A build whose heading ids were corrupted at build time (see docs/repro) fails here.
const ids = (html: string) => {
  const found: string[] = [];
  for (const region of html.matchAll(/<analog-markdown\b[^>]*>([\s\S]*?)<\/analog-markdown>/g))
    for (const heading of region[1]!.matchAll(/<h[1-6]\b[^>]*\sid="([^"]*)"/g)) found.push(heading[1]!);
  return found;
};

const pages = [
  {
    app: apps.a,
    paths: [
      '/docs/guides/accessibility',
      '/docs/components/button',
      '/docs/v/1/installation',
      '/docs/reference/generated/vanta-alert-component',
    ],
  },
  {
    app: apps.b,
    paths: [
      '/onboarding/first-application',
      '/guides/environments',
      '/v/1/reference/api',
      '/reference/generated/forge-client',
    ],
  },
];

test.describe('E2E-133 heading identity across prerendered HTML, hydrated DOM, TOC and search', () => {
  for (const { app, paths } of pages) {
    for (const path of paths) {
      test(`${new URL(app.url).port}${path}: hydration keeps the prerendered ids and every TOC link reaches one`, async ({
        page,
        request,
      }) => {
        const prerendered = ids(await (await request.get(`${app.url}${path}`)).text());
        expect(prerendered.length).toBeGreaterThan(0);
        await page.goto(`${app.url}${path}`);
        await expect(page.locator('.doq-markdown').first()).toBeVisible();
        const hydrated = await page.evaluate(() =>
          Array.from(document.querySelectorAll('.doq-markdown :is(h1,h2,h3,h4,h5,h6)[id]')).map((el) => el.id),
        );
        expect(hydrated).toEqual(prerendered);
        const links = await page
          .locator('.doq-toc a')
          .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
        for (const href of links)
          expect(hydrated, `TOC link ${href}`).toContain(decodeURIComponent(href.slice(href.indexOf('#') + 1)));
      });
    }
  }

  test('search result anchors name real headings of the page they open', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/overview`);
    await page
      .getByRole('button', { name: /^Search/ })
      .first()
      .click();
    const dialog = page.getByRole('dialog', { name: 'Search documentation' });
    await dialog.getByRole('searchbox').fill('keyboard');
    const results = dialog.getByRole('link');
    await expect(results.first()).toBeVisible();
    const hrefs = await results.evaluateAll((els) =>
      els
        .map((el) => el.getAttribute('href') ?? '')
        .filter((href) => href.includes('#'))
        .slice(0, 5),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const [path, fragment] = href.split('#') as [string, string];
      const html = await (await page.request.get(`${apps.a.url}${path}`)).text();
      expect(ids(html), href).toContain(decodeURIComponent(fragment));
    }
  });
});
