import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import type { Page } from '../lib/page.ts';
import type { Showcase } from '../lib/types.ts';
import { waitFor } from '../lib/wait.ts';

export async function mobileNavigation(page: Page, app: Showcase) {
  await page.viewport(375, 812);
  await page.navigate(`http://127.0.0.1:${app.port}${app.doc}`);
  let state = await page.evaluate(
    `(()=>{const b=document.querySelector('.doq-mobile-trigger'),n=document.querySelector('#doq-mobile-navigation');return{trigger:!!b,expanded:b?.getAttribute('aria-expanded'),display:getComputedStyle(n).display,docOverflow:document.documentElement.scrollWidth>innerWidth}})()`,
  );
  assert.equal(state.trigger, true);
  assert.equal(state.expanded, 'false');
  assert.equal(state.display, 'none');
  assert.equal(state.docOverflow, false);
  await page.click('.doq-mobile-trigger');
  await page.waitVisible('#doq-mobile-navigation');
  state = await page.evaluate(
    `(()=>{const b=document.querySelector('.doq-mobile-trigger'),n=document.querySelector('#doq-mobile-navigation'),r=n.getBoundingClientRect();return{expanded:b.getAttribute('aria-expanded'),focusInside:n.contains(document.activeElement),x:r.x,right:r.right,width:r.width,side:r.x>0?'right':'left'}})()`,
  );
  assert.equal(state.expanded, 'true');
  assert.ok(state.focusInside, 'opening drawer should focus its first link');
  assert.ok(state.width <= 375 && state.x >= 0 && state.right <= 375, 'drawer must fit viewport');
  assert.equal(state.side, app.side);
  const group = await page.evaluate(
    "(()=>{const d=document.querySelector('.doq-nav-group:not([open])');return d?{label:d.querySelector('summary').textContent,selector:'.doq-nav-group:not([open]) summary'}:null})()",
  );
  if (group) {
    await page.click(group.selector);
    assert.ok(
      await page.evaluate("[...document.querySelectorAll('.doq-nav-group')].some(d=>d.open)"),
      'nested group must expand',
    );
  } else
    assert.ok(
      await page.evaluate("[...document.querySelectorAll('.doq-nav-group')].some(d=>d.open)"),
      'active nested group should be expanded',
    );
  await page.press('Tab');
  const focusStyle = await page.evaluate(
    "(()=>{const e=document.activeElement,s=getComputedStyle(e);return document.querySelector('.doq-sidebar').contains(e)&&e.matches(':focus-visible')&&s.outlineStyle!=='none'&&s.outlineWidth!=='0px'})()",
  );
  assert.ok(focusStyle, 'keyboard focus should stay in navigation and show a visible indicator');
  await page.evaluate(
    "window.__doqKeys=[];document.addEventListener('keydown',e=>window.__doqKeys.push({key:e.key,target:e.target.className}),true)",
  );
  await page.press('Escape');
  await delay(150);
  const escapeState = await page.evaluate(
    "({expanded:document.querySelector('.doq-mobile-trigger').getAttribute('aria-expanded'),keys:window.__doqKeys})",
  );
  assert.equal(
    escapeState.expanded,
    'false',
    `Escape should close drawer; browser delivered ${JSON.stringify(escapeState.keys)}`,
  );
  assert.equal(
    await page.evaluate("document.activeElement.matches('.doq-mobile-trigger')"),
    true,
    'closing should return focus to trigger',
  );
  const currentPath = await page.evaluate('location.pathname');
  await page.evaluate(
    "window.__doqLinkClicks=[];document.querySelector('#doq-mobile-navigation').addEventListener('click',e=>window.__doqLinkClicks.push({tag:e.target.tagName,href:e.target.closest('a')?.getAttribute('href')}),true)",
  );
  await page.click('.doq-mobile-trigger');
  await page.waitVisible('#doq-mobile-navigation');
  await page.click('.doq-nav-link:not(.is-active)');
  await waitFor(
    async () => await page.evaluate(`location.pathname!==${JSON.stringify(currentPath)}`),
    'documentation route navigation',
  );
  await waitFor(
    async () =>
      await page.evaluate(
        "document.querySelector('.doq-nav-link.is-active')?.getAttribute('href')===location.pathname",
      ),
    'new documentation route rendered',
  );
  await delay(200);
  const afterNav = await page.evaluate(
    "({expanded:document.querySelector('.doq-mobile-trigger')?.getAttribute('aria-expanded'),path:location.pathname,clicks:window.__doqLinkClicks})",
  );
  assert.equal(
    afterNav.expanded,
    'false',
    `selecting a document link should close the mobile drawer: ${JSON.stringify(afterNav)}`,
  );
  await page.navigate(`http://127.0.0.1:${app.port}${app.doc}`);
  for (let i = 0; i < 3; i++) {
    await page.click('.doq-mobile-trigger');
    await page.waitVisible('#doq-mobile-navigation');
    assert.equal(
      await page.evaluate("document.querySelector('.doq-mobile-trigger').getAttribute('aria-expanded')"),
      'true',
    );
    const closeBefore = await page.evaluate(
      "(()=>{const e=document.querySelector('.doq-mobile-close'),r=e?.getBoundingClientRect(),hit=r&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{display:e?getComputedStyle(e).display:null,x:r?.x,y:r?.y,width:r?.width,height:r?.height,hit:hit?.outerHTML??null}})()",
    );
    assert.ok(
      closeBefore.display !== 'none' && closeBefore.width > 0,
      `close control should be visible: ${JSON.stringify(closeBefore)}`,
    );
    await page.click('.doq-mobile-close');
    await delay(150);
    const closed = await page.evaluate(
      "(()=>({expanded:document.querySelector('.doq-mobile-trigger')?.getAttribute('aria-expanded')??null,display:document.querySelector('.doq-sidebar')?getComputedStyle(document.querySelector('.doq-sidebar')).display:null,active:document.activeElement?.className??null,path:location.pathname,closeButton:!!document.querySelector('.doq-mobile-close')}))()",
    );
    assert.equal(
      closed.expanded,
      'false',
      `close control should close the drawer: before=${JSON.stringify(closeBefore)}, after=${JSON.stringify(closed)}`,
    );
  }
  await page.evaluate("document.querySelector('.doq-mobile-trigger').focus()");
  await page.press('Tab');
  assert.equal(
    await page.evaluate("document.querySelector('#doq-mobile-navigation').contains(document.activeElement)"),
    false,
    'Tab must skip descendants of the closed drawer',
  );
  const hiddenFocusable = await page.evaluate(
    "(()=>{const n=document.querySelector('#doq-mobile-navigation');return [...n.querySelectorAll('a,button,summary')].filter(e=>e.tabIndex>=0&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden').length})()",
  );
  assert.equal(hiddenFocusable, 0, 'closed drawer must not expose visible tabbable descendants');
}
