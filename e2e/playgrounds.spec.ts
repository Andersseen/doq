import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { apps, expect, expectClipboard, nextFocusKey, test } from './fixtures.ts';

const volt = `${apps.a.url}/docs/components/button`;
const forge = `${apps.b.url}/concepts/models`;
const official = `${apps.site.url}/docs/guides/interactive-playgrounds`;
const group = (page: Page, name: string) => page.getByRole('group', { name, exact: true });

test.describe('E2E-110 interactive playgrounds', () => {
  test('PLAY-001/002/004/005: the real Volt UI button follows boolean and select controls', async ({ page }) => {
    await page.goto(volt);
    const playground = group(page, 'Volt UI button');
    await expect(playground).toBeVisible();
    const button = playground.locator('.doq-pg-frame button[voltbutton]');
    await expect(button).toHaveText('Save changes');
    await expect(button).toHaveAttribute('data-variant', 'solid');
    await playground.getByLabel('Variant').selectOption('Outline');
    await expect(button).toHaveAttribute('data-variant', 'outline');
    await playground.getByLabel('Size').selectOption('Large');
    await expect(button).toHaveAttribute('data-size', 'lg');
    await playground.getByLabel('Label').fill('Publish');
    await expect(button).toHaveText('Publish');
    await playground.getByLabel('Disabled').check();
    await expect(button).toBeDisabled();
  });

  test('PLAY-003/006/007: numbers are validated, outputs are listed and reset restores everything', async ({
    page,
  }) => {
    await page.goto(forge);
    const request = group(page, 'Delivery request');
    await request.getByLabel('Limit').fill('250');
    await expect(request.getByText('Must be at most 100.')).toBeVisible();
    await expect(request.getByLabel('Limit')).toHaveAttribute('aria-invalid', 'true');
    await expect(request.getByLabel('Request URL')).toContainText('limit=20&');
    await request.getByLabel('Limit').fill('35');
    await request.getByLabel('Locale').selectOption('Deutsch');
    await request.getByLabel('Include drafts').check();
    await expect(request.getByLabel('Request URL')).toHaveText(
      'GET /v1/entries?collection=product-guides&limit=35&locale=de&status=draft',
    );
    await request.getByRole('button', { name: 'Send request' }).click();
    await expect(request.getByRole('list', { name: 'Events' })).toContainText('Request sent');
    await expect(request.getByRole('list', { name: 'Events' })).toContainText('method: "GET"');
    await request.getByRole('button', { name: 'Reset' }).click();
    await expect(request.getByLabel('Request URL')).toHaveText(
      'GET /v1/entries?collection=product-guides&limit=20&locale=en',
    );
    await expect(request.getByLabel('Limit')).toHaveValue('20');
    await expect(request.getByText(/No events yet/)).toBeVisible();
  });

  test('PLAY-008/021: preview widths stay inside the viewport and the component keeps its state', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(volt);
    const playground = group(page, 'Volt UI button');
    const frame = playground.locator('.doq-pg-frame');
    const button = frame.locator('button[voltbutton]');
    await button.click();
    await expect(playground.getByRole('list', { name: 'Events' })).toContainText('Pressed');
    for (const [name, max] of [
      ['Mobile', 320],
      ['Tablet', 768],
      ['Responsive', 10_000],
    ] as const) {
      await playground.getByRole('button', { name, exact: true }).click();
      await expect(playground.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
      expect((await frame.boundingBox())!.width).toBeLessThanOrEqual(max);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
    await expect(playground.getByRole('list', { name: 'Events' })).toContainText('Pressed');
  });

  test('PLAY-009/010/011/024: expand by keyboard, keep the instance, close with Escape, focus returns', async ({
    page,
  }) => {
    await page.goto(volt);
    const playground = group(page, 'Volt UI button');
    await playground.getByLabel('Label').fill('Kept');
    const expand = playground.getByRole('button', { name: 'Expand' });
    await expand.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: /Volt UI button — expanded preview/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('button[voltbutton]')).toHaveText('Kept');
    await dialog.locator('button[voltbutton]').click();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(expand).toBeFocused();
    await expect(playground.locator('.doq-pg-frame button[voltbutton]')).toHaveText('Kept');
    await expect(playground.getByRole('list', { name: 'Events' })).toContainText('Pressed');
  });

  test('PLAY-012/013: the code panel follows the controls and copy puts exactly that text on the clipboard', async ({
    page,
  }) => {
    await page.goto(volt);
    const playground = group(page, 'Volt UI button');
    await playground.getByLabel('Variant').selectOption('Ghost');
    await playground.getByLabel('Label').fill('Say "hi" <now>');
    const code = playground.locator('.doq-pg-panel code');
    const shown = (await code.textContent())!;
    expect(shown).toContain('variant="ghost"');
    expect(shown).toContain('>Say "hi" &lt;now&gt;</button>');
    await playground.getByRole('button', { name: 'Copy Template code' }).click();
    await expect(playground.getByRole('button', { name: 'Template code copied' })).toBeVisible();
    await expectClipboard(page, shown);
  });

  test('PLAY-012: several code examples are real tabs, operable by keyboard', async ({ page }) => {
    await page.goto(forge);
    const retry = group(page, 'Retry policy');
    const tabs = retry.getByRole('tablist', { name: 'Usage code' }).getByRole('tab');
    await expect(tabs).toHaveText(['Template', 'Component']);
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(retry.getByRole('tabpanel', { name: 'Component' })).toContainText('ForgeRetryPlaygroundComponent');
    await expect(retry.getByRole('tabpanel', { name: 'Template' })).toBeHidden();
  });

  test('PLAY-014/015: two playgrounds on one page are independent and navigation leaves no stale state', async ({
    page,
  }) => {
    await page.goto(forge);
    const retry = group(page, 'Retry policy');
    const request = group(page, 'Delivery request');
    await retry.getByLabel('Retries').fill('2');
    await retry.getByLabel('Backoff').selectOption('Fixed');
    await expect(retry.getByLabel('Retry schedule').locator('li')).toHaveText([
      'Attempt 2 after 200 ms',
      'Attempt 3 after 200 ms',
    ]);
    await expect(request.getByLabel('Request URL')).toContainText('limit=20');
    await retry.getByRole('button', { name: 'Simulate failure' }).click();
    await expect(retry.getByRole('list', { name: 'Events' })).toContainText('retries: 2');
    // Client-side navigation away and back builds a fresh instance: nothing from the previous one survives.
    await page
      .getByRole('navigation', { name: 'Page navigation' })
      .getByRole('link', { name: /Previous/ })
      .click();
    await expect(page).not.toHaveURL(/concepts\/models/);
    await expect(page.locator('.doq-playground')).toHaveCount(0);
    await page.goBack();
    await expect(group(page, 'Retry policy').getByLabel('Retries')).toHaveValue('3');
    await expect(group(page, 'Retry policy').getByText(/No events yet/)).toBeVisible();
  });

  test('PLAY-016/017/018/020: prerendered markup, surrounding Markdown, TOC, search and legacy demos', async ({
    page,
    request,
  }) => {
    const html = await (await request.get(volt)).text();
    expect(html).toContain('data-doq-playground="vanta-button"');
    expect(html).toContain('<button voltbutton');
    expect(html).toMatch(/<option[^>]*selected[^>]*>Medium<\/option>/);
    await page.goto(volt);
    const order = await page
      .locator('.doq-content')
      .evaluate((root) =>
        Array.from(root.querySelectorAll('h2[id], [data-doq-playground], [data-doq-demo]')).map(
          (el) => el.getAttribute('data-doq-playground') ?? el.getAttribute('data-doq-demo') ?? el.id,
        ),
      );
    expect(order).toEqual(['choose-a-style', 'vanta-button', 'example', 'behavior']);
    await expect(page.getByRole('complementary', { name: 'On this page' })).toContainText('Choose a style');
    // The frontmatter demo still follows the content, untouched.
    await expect(page.locator('.doq-article > .doq-region [aria-label="Vanta button demo"]')).toBeVisible();
    // Chrome is excluded from the index; the Markdown around the playground is searchable.
    const found = await page.evaluate(async () => {
      const url = '/pagefind/pagefind.js';
      const pagefind = await import(/* @vite-ignore */ url);
      await pagefind.init();
      const hit = (await pagefind.search('Change the inputs of a real Volt UI button')).results[0];
      const data = hit ? await hit.data() : undefined;
      return { url: data?.url, content: data?.content as string | undefined };
    });
    expect(found.url).toContain('/docs/components/button');
    expect(found.content).toContain('Change the inputs of a real Volt UI button');
    expect(found.content).toContain('Choose a style');
    for (const chrome of [
      'Preview width',
      'Reset',
      'Expand',
      'Not set',
      'Destructive',
      'No events yet',
      'Copy Template code',
    ])
      expect(found.content, chrome).not.toContain(chrome);
  });
  test('PLAY-022/023/025: the official documentation hosts a live Angular Movement playground, light and dark, reduced motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(official);
    const playground = group(page, 'Angular Movement enter animation');
    await expect(playground.getByTestId('movement-target')).toHaveText('fade-up');
    await playground.getByLabel('Preset').selectOption('zoom-in');
    await expect(playground.getByTestId('movement-target')).toHaveText('zoom-in');
    await playground.getByLabel('Duration (ms)').fill('1200');
    await expect(playground.getByRole('list', { name: 'Events' })).toContainText('duration: 1200');
    await playground.getByRole('button', { name: 'Play again' }).click();
    await expect(playground.getByRole('list', { name: 'Events' }).locator('li')).toHaveCount(3);
    const code = playground.locator('.doq-pg-panel code');
    await expect(code).toContainText('moveEnter="zoom-in"');
    await expect(code).toContainText('[moveDuration]="1200"');
    for (const theme of ['Switch to light theme', 'Switch to dark theme']) {
      const toggle = page.getByRole('button', { name: theme });
      if (await toggle.count()) await toggle.first().click();
      const results = await new AxeBuilder({ page }).include('.doq-playground').analyze();
      expect(results.violations, theme).toEqual([]);
    }
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('PLAY-024: every control is reachable and operable with the keyboard alone', async ({ page }) => {
    await page.goto(forge);
    const request = group(page, 'Delivery request');
    await request.getByLabel('Collection').focus();
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      order.push(
        await page.evaluate(() => (document.activeElement as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? ''),
      );
      await page.keyboard.press(nextFocusKey(page));
    }
    expect(order).toEqual(['Collection *', 'Limit', 'Locale', 'Include drafts']);
    await expect(request.getByRole('button', { name: 'Send request' })).toBeVisible();
    await request.getByLabel('Include drafts').focus();
    await page.keyboard.press('Space');
    await expect(request.getByLabel('Request URL')).toContainText('status=draft');
    await request.getByRole('button', { name: 'Send request' }).focus();
    await page.keyboard.press('Enter');
    await expect(request.getByRole('list', { name: 'Events' })).toContainText('Request sent');
  });

  test('PLAY-026: forge request page passes axe with both playgrounds', async ({ page }) => {
    await page.goto(forge);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
