import { apps, expect, test } from './fixtures.ts';

test.describe('E2E-014 previous and next documents', () => {
  test('Next opens the canonical document from its top with focus on its heading, and Back returns', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 700 });
    const start = `${apps.a.url}/docs/guides/accessibility`;
    await page.goto(start);
    await page.getByRole('complementary', { name: 'On this page' }).getByRole('link', { name: 'Checklist' }).click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);

    const pager = page.getByRole('navigation', { name: 'Page navigation' });
    const previous = pager.getByRole('link', { name: /Previous/ });
    const target = await previous.getAttribute('href');
    expect(target).toMatch(/^\/docs\//);
    await previous.click();
    await expect(page).toHaveURL(`${apps.a.url}${target}`);
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Accessibility');
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    expect(await page.evaluate(() => scrollY)).toBe(0);

    await page.goBack();
    await expect(page).toHaveURL(`${start}#checklist`);
    await expect(page.getByRole('heading', { level: 1, name: 'Accessibility' })).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(`${apps.a.url}${target}`);
  });

  test('Showcase B pagination links use the public custom-slug URLs', async ({ page }) => {
    await page.goto(`${apps.b.url}/docs/onboarding/first-application`);
    const hrefs = await page
      .getByRole('navigation', { name: 'Page navigation' })
      .getByRole('link')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).not.toContain('getting-started');
    await page.getByRole('navigation', { name: 'Page navigation' }).getByRole('link').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  });
});
