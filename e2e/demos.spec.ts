import { apps, expect, test } from './fixtures.ts';

test.describe('E2E-006 consumer-owned Angular demos', () => {
  test('Showcase A: the Vanta demo counts activations', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/components/button`);
    const demo = page.getByRole('region', { name: 'Vanta button demo' });
    await expect(demo.getByText('0 activations')).toBeVisible();
    await demo.getByRole('button', { name: 'Save changes' }).click();
    await demo.getByRole('button', { name: 'Save changes' }).click();
    await expect(demo.getByText('2 activations')).toBeVisible();
  });

  test('Showcase B: the Forge demo reflects the selected field type', async ({ page }) => {
    await page.goto(`${apps.b.url}/onboarding/first-application`);
    const demo = page.getByRole('region', { name: 'Forge content model demo' });
    await expect(demo.getByText('Rich text', { exact: false }).last()).toBeVisible();
    await demo.getByLabel('Field type').selectOption('Boolean');
    await expect(demo.locator('strong')).toHaveText('Boolean');
  });

  test('a demo survives client-side navigation', async ({ page }) => {
    await page.goto(`${apps.a.url}/docs/overview`);
    await page.getByRole('navigation', { name: 'Vanta UI docs' }).getByText('Components').click();
    await page.getByRole('navigation', { name: 'Vanta UI docs' }).getByRole('link', { name: 'Button' }).click();
    const demo = page.getByRole('region', { name: 'Vanta button demo' });
    await demo.getByRole('button', { name: 'Save changes' }).click();
    await expect(demo.getByText('1 activations')).toBeVisible();
  });
});
