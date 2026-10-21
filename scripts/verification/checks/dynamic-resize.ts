import assert from 'node:assert/strict';
import type { Page } from '../lib/page.ts';
import type { Showcase } from '../lib/types.ts';
import { waitFor } from '../lib/wait.ts';

export async function dynamic(page: Page, app: Showcase) {
  await page.viewport(375, 812);
  await page.navigate(`http://127.0.0.1:${app.port}${app.doc}`);
  for (const [w, h] of [
    [768, 1024],
    [1280, 800],
    [375, 812],
  ] as const) {
    await page.viewport(w, h);
    const m = await page.evaluate(
      "({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,expanded:document.querySelector('.doq-mobile-trigger')?.getAttribute('aria-expanded'),side:document.querySelector('.doq-root')?.dataset.sidebar})",
    );
    assert.ok(m.scroll <= m.width + 1);
    if (w > 720) assert.equal(m.expanded, 'false');
  }
  await page.viewport(375, 812);
  await page.click('.doq-mobile-trigger');
  await page.waitVisible('#doq-mobile-navigation');
  await page.viewport(1280, 800);
  await page.viewport(375, 812);
  const drawer = await page.evaluate(
    "({expanded:document.querySelector('.doq-mobile-trigger').getAttribute('aria-expanded'),display:getComputedStyle(document.querySelector('.doq-sidebar')).display,active:document.querySelector('.doq-nav-link.is-active')?.getAttribute('href'),focusInDrawer:document.querySelector('.doq-sidebar').contains(document.activeElement)})",
  );
  assert.equal(drawer.expanded, 'true');
  assert.notEqual(drawer.display, 'none');
  assert.ok(drawer.active);
  assert.ok(drawer.focusInDrawer);
  await page.viewport(768, 1024);
  await page.viewport(375, 812);
  assert.equal(
    await page.evaluate("document.querySelector('.doq-mobile-trigger').getAttribute('aria-expanded')"),
    'true',
  );
  const closedGroup = await page.evaluate("!!document.querySelector('.doq-nav-group:not([open]) summary')");
  if (closedGroup) {
    await page.click('.doq-nav-group:not([open]) summary');
    await waitFor(
      async () => await page.evaluate("[...document.querySelectorAll('.doq-nav-group')].some(g=>g.open)"),
      'nested group open after resize',
    );
  }
  const targetHref = await page.evaluate(
    "[...document.querySelectorAll('.doq-sidebar .doq-nav-link:not(.is-active)')].find(e=>e.getClientRects().length)?.getAttribute('href')??null",
  );
  assert.ok(targetHref, 'an alternate visible document link must be available');
  const beforeNavigation = await page.evaluate('location.pathname');
  await page.click(`.doq-nav-link[href=${JSON.stringify(targetHref)}]`);
  await waitFor(
    async () => await page.evaluate(`location.pathname!==${JSON.stringify(beforeNavigation)}`),
    'navigation while drawer remains open',
  );
  await waitFor(
    async () =>
      await page.evaluate("document.querySelector('.doq-mobile-trigger')?.getAttribute('aria-expanded')==='false'"),
    'route selection closes drawer',
  );
  await page.viewport(1440, 900);
  const desktop = await page.evaluate(
    "({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,active:document.querySelector('.doq-nav-link.is-active')?.getAttribute('href'),path:location.pathname})",
  );
  assert.ok(desktop.scroll <= desktop.width + 1);
  assert.equal(
    desktop.active,
    desktop.path,
    'active page should remain selected after open-drawer navigation and desktop resize',
  );
}
