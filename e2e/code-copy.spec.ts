import { apps, expect, test } from './fixtures.ts';

test.describe('E2E-005 code copy', () => {
  test('copies the exact code text to the clipboard', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/guides/routing`);
    const block = page.locator('.doq-markdown pre').first();
    const expected = await block.locator('code').innerText();
    const copy = block.getByRole('button', { name: 'Copy code' });
    await copy.click();
    await expect(block.getByRole('button', { name: 'Code copied' })).toHaveText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
    expect(expected).toContain('src/content/docs/');
  });

  test('exactly one copy control per block, also after repeated navigation', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/guides/routing`);
    const nav = page.getByRole('navigation', { name: 'Vanta UI docs' });
    for (let i = 0; i < 3; i++) {
      await nav.getByRole('link', { name: 'Theming' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Theming' })).toBeVisible();
      await nav.getByRole('link', { name: 'Routing and content' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Routing and content' })).toBeVisible();
    }
    const blocks = page.locator('.doq-markdown pre');
    for (let i = 0; i < (await blocks.count()); i++) {
      await expect(blocks.nth(i).locator('button.doq-code-copy')).toHaveCount(1);
    }
  });

  test('Showcase B copies a highlighted shell command verbatim', async ({ page }) => {
    await page.goto(`${apps.b.url}/onboarding/first-application`);
    const block = page.locator('.doq-markdown pre').first();
    await block.getByRole('button', { name: 'Copy code' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('pnpm add @forgecms/client\n');
  });
});
