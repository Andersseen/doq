/**
 * Runs the Playwright suite against production builds.
 *
 *   pnpm test:e2e [--skip-consumer] [playwright args...]     e.g. pnpm test:e2e e2e/toc.spec.ts --headed
 *
 * Needs `pnpm build` (both showcases) first. The tarball consumer is (re)built from artifacts/ when missing or older
 * than the tarball. Browsers are installed inside node_modules (PLAYWRIGHT_BROWSERS_PATH=0), never under $HOME:
 *   PLAYWRIGHT_BROWSERS_PATH=0 pnpm exec playwright install chromium
 * Set PW_CHANNEL=chrome to use an installed Google Chrome instead.
 */
import { spawnSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const skipConsumer = args.includes('--skip-consumer') || !!process.env['E2E_SKIP_CONSUMER'];
const passthrough = args.filter((arg) => arg !== '--skip-consumer');

const mtime = async (path: string) => (await stat(path).catch(() => undefined))?.mtimeMs;
const run = (command: string, commandArgs: string[], env: NodeJS.ProcessEnv = {}) =>
  spawnSync(command, commandArgs, { cwd: repo, stdio: 'inherit', env: { ...process.env, ...env } }).status ?? 1;

for (const output of ['showcase-a/dist/analog', 'showcase-b/dist/analog', 'showcase-b/dist/analog-nosearch']) {
  if ((await mtime(resolve(repo, `apps/${output}/public/index.html`))) === undefined) {
    console.error(`e2e: apps/${output} has no production build. Run "pnpm build" first.`);
    process.exit(1);
  }
}

const consumers = [
  { app: 'showcase-b', dir: resolve(process.env['DOQ_CONSUMER_DIR'] ?? resolve(tmpdir(), 'doq-e2e-consumer')) },
  { app: 'showcase-a', dir: resolve(process.env['DOQ_CONSUMER_A_DIR'] ?? resolve(tmpdir(), 'doq-e2e-consumer-a')) },
];
if (!skipConsumer) {
  const { version } = JSON.parse(await readFile(resolve(repo, 'packages/doq/package.json'), 'utf8')) as {
    version: string;
  };
  const tarball = resolve(repo, `artifacts/doqs-analog-${version}.tgz`);
  const tarballTime = await mtime(tarball);
  if (tarballTime === undefined) {
    console.error('e2e: no tarball. Run "pnpm pack:doq" first (or pass --skip-consumer).');
    process.exit(1);
  }
  for (const consumer of consumers) {
    const builtTime = await mtime(resolve(consumer.dir, 'dist/analog/public/index.html'));
    if (builtTime === undefined || builtTime < tarballTime) {
      const status = run('node', ['scripts/consumer.ts', tarball, consumer.dir, `--app=${consumer.app}`]);
      if (status !== 0) process.exit(status);
    }
  }
}

const status = run('pnpm', ['exec', 'playwright', 'test', ...passthrough], {
  PLAYWRIGHT_BROWSERS_PATH: process.env['PLAYWRIGHT_BROWSERS_PATH'] ?? '0',
  DOQ_CONSUMER_DIR: consumers[0]!.dir,
  DOQ_CONSUMER_A_DIR: consumers[1]!.dir,
  ...(skipConsumer ? { E2E_SKIP_CONSUMER: '1' } : {}),
});
process.exit(status);
