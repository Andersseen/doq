#!/usr/bin/env node
/**
 * Production browser acceptance harness. See scripts/verification/README.md.
 * Serves the built showcases (and optionally an external consumer), drives isolated headless Chrome
 * through the Chrome DevTools Protocol, and exits non-zero when any check fails.
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { clipboard } from './checks/clipboard.ts';
import { diagnostics } from './checks/diagnostics.ts';
import { dynamic } from './checks/dynamic-resize.ts';
import { mobileNavigation } from './checks/mobile-navigation.ts';
import { responsive } from './checks/responsive.ts';
import { toc } from './checks/toc.ts';
import { v01 } from './checks/v01.ts';
import { consumerApp, isSelected, repo, selectedShowcases } from './lib/config.ts';
import { launchChrome, type ChromeSession } from './lib/chrome.ts';
import { createTocFixtures, rebuildShowcaseA, restoreTocFixtures } from './lib/fixtures.ts';
import { Page } from './lib/page.ts';
import { fail, pass, summarize } from './lib/report.ts';
import { startPreview, stopServers } from './lib/servers.ts';
import type { Showcase } from './lib/types.ts';
import { join } from 'node:path';

const PASS_TEXT = (app: Showcase) => `production browser verification succeeded at required viewports for ${app.name}`;

/** Per-showcase checks: [filter key, report id, run, PASS message]. */
const showcaseChecks = (page: Page, app: Showcase) =>
  [
    ['m15', `M15 ${app.name}`, () => mobileNavigation(page, app), PASS_TEXT(app)],
    ['m24', `M24 ${app.name}`, () => responsive(page, app), PASS_TEXT(app)],
    ['dynamic', `M24 dynamic ${app.name}`, () => dynamic(page, app), PASS_TEXT(app)],
    ['m16', `M16 ${app.name}`, () => toc(page, app), PASS_TEXT(app)],
    ['m17', `M17 ${app.name}`, () => clipboard(page, app), PASS_TEXT(app)],
    ['m23', `M23 ${app.name}`, () => diagnostics(page, app), undefined],
    [
      'v01',
      `V01 ${app.name}`,
      () => v01(page, app),
      `0.1 presentation, slots and metadata verified at desktop and mobile for ${app.name}`,
    ],
  ] as const;

async function runDuplicateRouteFixture(): Promise<void> {
  const child = spawn(process.execPath, ['scripts/verification/duplicate-routes.ts'], { cwd: repo, stdio: 'ignore' });
  const exit = await new Promise((resolve) => child.on('exit', resolve));
  assert.equal(exit, 0, 'duplicate route API fixture failed');
}

async function main(): Promise<void> {
  const servers: ChildProcess[] = [];
  let chrome: ChromeSession | undefined;
  let fixturesCreated = false;
  try {
    if (selectedShowcases.some((app) => app.key === 'a') && isSelected('m16')) {
      await createTocFixtures();
      fixturesCreated = true;
      await rebuildShowcaseA();
    }
    for (const app of selectedShowcases) {
      servers.push(await startPreview(app.name, join(repo, app.root), app.port));
    }
    if (consumerApp) {
      servers.push(await startPreview(consumerApp.name, consumerApp.distRoot!, consumerApp.port));
    }
    const origins = [...selectedShowcases, ...(consumerApp ? [consumerApp] : [])].map(
      (app) => `http://127.0.0.1:${app.port}`,
    );
    chrome = await launchChrome(['http://127.0.0.1:4173', 'http://127.0.0.1:4174', ...origins]);
    console.log(`Browser: ${chrome.bin} (isolated headless Chrome via Chrome DevTools Protocol)`);
    const page = new Page(chrome.cdp);

    try {
      await runDuplicateRouteFixture();
      pass('M9', 'real exported normalization/sorting API rejects duplicate routes and validates slug cases');
    } catch (error) {
      fail('M9', error);
    }

    for (const app of selectedShowcases) {
      for (const [key, id, run, message] of showcaseChecks(page, app)) {
        if (!isSelected(key)) continue;
        try {
          await run();
          if (message) pass(id, message);
        } catch (error) {
          fail(id, error);
        }
      }
    }

    if (consumerApp && isSelected('m23')) {
      try {
        await diagnostics(page, consumerApp);
      } catch (error) {
        fail('M23 External consumer', error);
      }
    }
    if (consumerApp && isSelected('v01')) {
      try {
        await v01(page, consumerApp);
        pass(
          'V01 External consumer',
          '0.1 presentation, slots and metadata verified in the tarball-installed consumer',
        );
      } catch (error) {
        fail('V01 External consumer', error);
      }
    }
    if (!consumerApp && isSelected('m23')) {
      fail(
        'M23 External consumer',
        new Error(
          'Set MVP_CONSUMER_ROOT to the external consumer dist/analog/public directory to verify its production hydration.',
        ),
      );
    }
  } catch (error) {
    fail('HARNESS', error);
  } finally {
    await chrome?.close();
    await stopServers(servers);
    if (fixturesCreated) {
      try {
        await restoreTocFixtures();
        console.log('Temporary TOC fixtures removed; Showcase A rebuilt without them.');
      } catch (error) {
        fail('HARNESS cleanup', error);
      }
    }
  }
  if (summarize()) process.exitCode = 1;
}

await main();
