import AxeBuilder from '@axe-core/playwright';
import { apps, expect, test } from './fixtures.ts';

// Automated smoke only: axe finds a subset of WCAG issues and this is not a conformance claim.
test.describe('E2E-010 accessibility smoke', () => {
  test('keyboard user can open the mobile menu, reach a page and close with Escape', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${apps.a.url}/docs/overview`);
    const trigger = page.getByRole('button', { name: 'Vanta UI docs menu' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('nav.doq-sidebar :focus')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });

  test('landmarks and controls have accessible names', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/components/button`);
    await expect(page.getByRole('navigation', { name: 'Vanta UI docs' })).toBeAttached();
    await expect(page.getByRole('navigation', { name: 'Page navigation' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'On this page' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy code' }).first()).toBeAttached();
    await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
  });

  test('each Doq page has exactly one level-one heading', async ({ page }) => {
    for (const url of [`${apps.a.url}/docs`, `${apps.a.url}/docs/overview`, `${apps.b.url}/concepts/models`]) {
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    }
  });

  for (const [name, url] of [
    ['Showcase A document', `${apps.a.url}/docs/components/button`],
    ['Showcase B document', `${apps.b.url}/onboarding/first-application`],
    ['Showcase A index', `${apps.a.url}/docs`],
  ] as const) {
    test(`axe finds no serious or critical WCAG A/AA violations: ${name}`, async ({ page }) => {
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      // Scoped to Doq's own markup: the host's header/footer colours belong to the host application.
      const results = await new AxeBuilder({ page })
        .include('.doq-root, .doq-index')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  }
});
