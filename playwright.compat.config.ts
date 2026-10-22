import { resolve } from 'node:path';
import { defineConfig } from '@playwright/test';

// One cell of the compatibility matrix: a tarball-installed consumer (scripts/compat.ts builds it) served from DOQ_COMPAT_DIR.
// The focused smoke suite in e2e/compat.spec.ts runs against it in every browser project of the matrix.
const port = Number(process.env.DOQ_COMPAT_PORT ?? 4290);
export const compatUrl = `http://127.0.0.1:${port}`;
const root = resolve(process.env.DOQ_COMPAT_DIR ?? 'missing-compat-dir', 'dist/analog/public');

export default defineConfig({
  testDir: 'e2e',
  testMatch: /compat\.spec\.ts/,
  outputDir: 'test-results/compat',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/compat' }]] : [['list']],
  use: { baseURL: compatUrl, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: process.env.PW_CHANNEL || undefined } }],
  webServer: {
    command: `node scripts/preview-static.ts ${root}`,
    url: compatUrl,
    env: { PORT: String(port) },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
