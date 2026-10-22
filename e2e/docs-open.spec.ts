import { apps, expect, test } from './fixtures.ts';

test.describe('E2E-001 open documentation', () => {
  test('Showcase A: from the host landing page to a rendered document', async ({ page }) => {
    await page.goto(apps.a.url);
    await page.getByRole('link', { name: /Explore the documentation/ }).click();
    await expect(page).toHaveURL(`${apps.a.url}/docs`);
    await expect(page.getByRole('heading', { level: 1, name: 'Build with Vanta UI' })).toBeVisible();

    await page.getByRole('link', { name: /Routing and content/ }).click();
    await expect(page).toHaveURL(`${apps.a.url}/docs/guides/routing`);
    await expect(page.getByRole('heading', { level: 1, name: 'Routing and content' })).toBeVisible();
    // Markdown became real elements, not source text.
    await expect(page.getByRole('heading', { level: 2, name: 'Add a document' })).toBeVisible();
    await expect(page.locator('.doq-markdown pre code').first()).toContainText('src/content/docs/');
    await expect(page).toHaveTitle('Routing and content · Vanta UI');
  });

  test('Showcase B: direct load renders prerendered content with the configured title suffix', async ({ page }) => {
    await page.goto(`${apps.b.url}/concepts/models`);
    await expect(page.getByRole('heading', { level: 1, name: 'Content models' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Model the meaning' })).toBeVisible();
    await expect(page).toHaveTitle('Content models · ForgeCMS Developers');
  });

  test('prerendered HTML contains the document before any JavaScript runs', async ({ request }) => {
    const response = await request.get(`${apps.a.url}/docs/guides/routing`);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('Add a document');
  });
});
