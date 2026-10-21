import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { CDP } from './cdp.ts';
import { waitFor } from './wait.ts';

const candidates = [
  process.env['CHROME_BIN'],
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter((candidate): candidate is string => !!candidate);

export interface ChromeSession {
  bin: string;
  cdp: CDP;
  close(): Promise<void>;
}

/** Start an isolated headless Chrome (temporary profile, ephemeral DevTools port) with clipboard access for `origins`. */
export async function launchChrome(origins: readonly string[]): Promise<ChromeSession> {
  let bin: string | undefined;
  for (const candidate of candidates) {
    try {
      await access(candidate);
      bin = candidate;
      break;
    } catch {
      // Try the next candidate.
    }
  }
  assert.ok(bin, `Chrome binary not found. Set CHROME_BIN; checked ${candidates.join(', ')}`);
  const profileRoot = await mkdtemp(join(tmpdir(), 'doq-mvp-verify-'));
  const chrome: ChildProcess = spawn(
    bin,
    [
      '--headless=new',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-extensions',
      '--remote-debugging-port=0',
      `--user-data-dir=${join(profileRoot, 'profile')}`,
      '--no-sandbox',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  const activePort = join(profileRoot, 'profile', 'DevToolsActivePort');
  await waitFor(async () => (await readFile(activePort, 'utf8')).trim().length > 0, 'Chrome DevToolsActivePort');
  const [port] = (await readFile(activePort, 'utf8')).trim().split('\n');
  const targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as {
    type: string;
    webSocketDebuggerUrl: string;
  }[];
  const target = targets.find((t) => t.type === 'page');
  assert.ok(target, 'Chrome page target missing');
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.ready();
  for (const domain of ['Page', 'Runtime', 'Network', 'Log']) await cdp.send(`${domain}.enable`);
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  for (const origin of origins) {
    await cdp
      .send('Browser.grantPermissions', { origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] })
      .catch(() => {});
    await cdp
      .send('Browser.setPermission', { permission: { name: 'clipboard-read' }, setting: 'granted', origin })
      .catch(() => {});
  }
  return {
    bin,
    cdp,
    async close() {
      cdp.close();
      if (chrome.exitCode === null) {
        chrome.kill('SIGTERM');
        const exited = await Promise.race([
          new Promise<boolean>((resolve) => chrome.once('exit', () => resolve(true))),
          delay(3000).then(() => false),
        ]);
        if (!exited) chrome.kill('SIGKILL');
      }
      // Chrome may still be flushing its profile for a moment after exit; a leftover temp dir must not fail the run.
      await rm(profileRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
    },
  };
}
