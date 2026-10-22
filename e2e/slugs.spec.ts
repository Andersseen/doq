import { apps, expect, test, EXPECTED_404_NOISE } from './fixtures.ts';

test.describe('E2E-002 nested and custom slugs', () => {
  test('nested documents open from navigation and survive a reload', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/overview`);
    await page.getByRole('navigation', { name: 'Vanta UI docs' }).getByText('Components').click();
    await page.getByRole('navigation', { name: 'Vanta UI docs' }).getByRole('link', { name: 'Button' }).click();
    await expect(page).toHaveURL(`${apps.a.url}/docs/components/button`);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Button' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Choose a style' })).toBeVisible();
  });

  test('a custom slug serves the real document, also after a direct reload', async ({ page }) => {
    await page.goto(`${apps.b.url}/onboarding/first-application`);
    await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Create a workspace' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 2, name: 'Request an entry' })).toBeVisible();
    await expect(page).toHaveURL(`${apps.b.url}/onboarding/first-application`);
  });

  test('the source filename of a custom-slug document is not a route', async ({
    page,
    request,
    problems,
    browserName,
  }) => {
    expect((await request.get(`${apps.b.url}/getting-started`)).status()).toBe(404);
    const response = await page.goto(`${apps.b.url}/getting-started`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Getting started' })).toHaveCount(0);
    // The browser logs the expected 404 document load; anything else is still a failure.
    const reported = problems.splice(0);
    if (browserName === 'chromium') {
      expect(reported).toEqual([
        'console.error: Failed to load resource: the server responded with a status of 404 (Not Found)',
      ]);
    } else {
      expect(reported.filter((problem) => !EXPECTED_404_NOISE.test(problem))).toEqual([]);
    }
  });

  test('links to a custom slug from the index use the public URL', async ({ page }) => {
    await page.goto(`${apps.b.url}/`);
    const link = page.getByRole('link', { name: /Getting started/ }).first();
    await expect(link).toHaveAttribute('href', '/onboarding/first-application');
  });
});
