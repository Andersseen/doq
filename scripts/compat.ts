/**
 * One cell of the Angular compatibility matrix: `pnpm verify:compat --angular=21|22`.
 *
 * Builds an independent docs-first consumer from the packed tarball with the requested Angular major (22 also installs
 * TypeScript 6, the only range Angular 22 supports; peers are checked strictly), which runs the installed `doq-api check`
 * and `doq-search` and builds and prerenders the site. Then it validates the static output (`docs:check`) and runs the focused
 * Angular-integration smoke suite (e2e/compat.spec.ts) against that build: installed Angular version, no Zone.js, hydration,
 * router history, tabs, search, versions and generated API pages. The full 200+ test suite stays on the primary environment.
 */
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const angular = process.argv.find((arg) => arg.startsWith('--angular='))?.slice('--angular='.length);
if (angular !== '21' && angular !== '22') {
  console.error('usage: node scripts/compat.ts --angular=21|22 [dir]');
  process.exit(2);
}
const { version } = JSON.parse(await readFile(resolve(repo, 'packages/doq/package.json'), 'utf8')) as {
  version: string;
};
const tarball = resolve(repo, `artifacts/doqs-analog-${version}.tgz`);
const dir = resolve(
  process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? resolve(tmpdir(), `doq-compat-ng${angular}`),
);

const step = (label: string, command: string, args: string[], env: NodeJS.ProcessEnv = {}) => {
  console.log(`\n=== compat Angular ${angular}: ${label}`);
  const status = spawnSync(command, args, { cwd: repo, stdio: 'inherit', env: { ...process.env, ...env } }).status ?? 1;
  if (status !== 0) {
    console.error(`compat Angular ${angular}: "${label}" failed (exit ${status})`);
    process.exit(status);
  }
};

step('consumer from the packed tarball (strict peers, doq-api check, doq-search, build)', 'node', [
  'scripts/consumer.ts',
  tarball,
  dir,
  '--app=showcase-b',
  `--angular=${angular}`,
]);
step('static output integrity', 'node', [
  'scripts/docs-check.ts',
  `--dist=${resolve(dir, 'dist/analog/public')}`,
  `--source=${dir}`,
]);
step('Angular integration smoke suite', 'pnpm', ['exec', 'playwright', 'test', '-c', 'playwright.compat.config.ts'], {
  DOQ_COMPAT_DIR: dir,
  DOQ_COMPAT_ANGULAR: angular,
  PLAYWRIGHT_BROWSERS_PATH: process.env['PLAYWRIGHT_BROWSERS_PATH'] ?? '0',
});
console.log(`\ncompat Angular ${angular}: PASS (${dir})`);
