import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { pass } from '../lib/report.ts';
import type { Page } from '../lib/page.ts';
import type { VerifiedApp } from '../lib/types.ts';
import { waitFor } from '../lib/wait.ts';

export async function diagnostics(page: Page, app: VerifiedApp) {
  const messages: { type: string; params: any }[] = [];
  const listeners: [string, (params: any) => void][] = [];
  for (const n of ['Runtime.exceptionThrown', 'Runtime.consoleAPICalled', 'Log.entryAdded', 'Network.loadingFailed']) {
    const listener = (p: unknown) => messages.push({ type: n, params: p });
    listeners.push([n, listener]);
    page.on(n, listener);
  }
  await page.viewport(1440, 900);
  for (const path of [app.doc, app.nested, app.doc]) {
    await page.navigate(`http://127.0.0.1:${app.port}${path}`);
    await page.evaluate(
      "document.querySelector('.doq-demo-button')?.click();document.querySelector('.forge-schema select')?.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('.doq-theme-toggle,.theme-toggle,[aria-label*=theme i]')?.click()",
    );
    if (await page.evaluate("!!document.querySelector('.doq-mobile-trigger')")) {
      await page.viewport(375, 812);
      await page.click('.doq-mobile-trigger');
      await page.press('Escape');
      await page.viewport(1440, 900);
    }
  }
  await page.navigate(`http://127.0.0.1:${app.port}${app.doc}`);
  await page.send('Page.reload', { ignoreCache: true });
  await waitFor(async () => (await page.evaluate('document.readyState')) === 'complete', 'reload');
  await delay(300);
  const relevant = messages.filter(
    (x) =>
      x.type === 'Runtime.exceptionThrown' ||
      x.type === 'Network.loadingFailed' ||
      (x.type === 'Runtime.consoleAPICalled' && x.params.type === 'error') ||
      (x.type === 'Log.entryAdded' && x.params.entry.level === 'error'),
  );
  assert.deepEqual(
    relevant,
    [],
    `${app.name} browser diagnostics: ${JSON.stringify(relevant.map((x) => ({ type: x.type, text: x.params.exceptionDetails?.text ?? x.params.args?.map((a: { value?: unknown }) => a.value).join(' ') ?? x.params.entry?.text ?? x.params.errorText })))}`,
  );
  const warnings = messages.filter(
    (x) =>
      (x.type === 'Runtime.consoleAPICalled' && x.params.type === 'warning') ||
      (x.type === 'Log.entryAdded' && x.params.entry.level === 'warning'),
  );
  const warningText = warnings
    .map((x) => x.params.args?.map((a: { value?: unknown }) => a.value).join(' ') ?? x.params.entry?.text ?? '')
    .filter(Boolean);
  console.log(
    `M23 ${app.name}: ${warnings.length} browser warnings captured; hydration-related warnings: ${warningText.filter((x) => /hydration/i.test(x)).length}.`,
  );
  for (const [name, listener] of listeners) page.off(name, listener);
  pass(
    `M23 ${app.name}`,
    'production routes, interactions and reload emitted no runtime exceptions, console errors or failed network requests',
  );
}
