import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { defineConfig } from '@playwright/test';

// Production builds served by the repository's static preview server. Ports differ from the CDP harness
// (4173-4175) so both suites can run at the same time.
export const apps = {
  a: { url: 'http://127.0.0.1:4273', root: 'apps/showcase-a/dist/analog/public' },
  b: { url: 'http://127.0.0.1:4274', root: 'apps/showcase-b/dist/analog/public' },
  consumer: {
    url: 'http://127.0.0.1:4275',
    root: resolve(process.env.DOQ_CONSUMER_DIR ?? resolve(tmpdir(), 'doq-e2e-consumer'), 'dist/analog/public'),
  },
} as const;

// E2E_SKIP_CONSUMER=1 (focused local runs) skips the tarball-installed consumer and its tests.
const withConsumer = !process.env.E2E_SKIP_CONSUMER;

const server = (app: (typeof apps)[keyof typeof apps], port: number) => ({
  command: `node scripts/preview-static.ts ${app.root}`,
  url: app.url,
  env: { PORT: String(port) },
  reuseExistingServer: false,
  timeout: 30_000,
});

export default defineConfig({
  testDir: 'e2e',
  testIgnore: withConsumer ? [] : /consumer\.spec/,
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  // PW_CHANNEL=chrome runs the installed Google Chrome instead of the downloaded Chromium build.
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: process.env.PW_CHANNEL || undefined } }],
  webServer: [server(apps.a, 4273), server(apps.b, 4274), ...(withConsumer ? [server(apps.consumer, 4275)] : [])],
});
