/**
 * One command per gate, deterministic and independent of any AI model.
 *
 *   pnpm verify:change   fast local gate: format, types, specs, Agentyx lock, unit, components, builds, package, contract, negative controls
 *   pnpm quality:gate    mandatory pre-PR gate: verify:change + tarball consumer, Playwright E2E and the CDP acceptance harness
 *
 * Steps run in order and stop at the first failure. E2E and harness steps need a browser (see CONTRIBUTING.md).
 */
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const mode = process.argv[2];
if (mode !== 'change' && mode !== 'full') {
  console.error('usage: node scripts/verify.ts <change|full>');
  process.exit(2);
}

const { version } = JSON.parse(await readFile(resolve(repo, 'packages/doq/package.json'), 'utf8')) as {
  version: string;
};
const tarball = `artifacts/getdoq-analog-${version}.tgz`;
const consumerDir = resolve(process.env['DOQ_CONSUMER_DIR'] ?? resolve(tmpdir(), 'doq-e2e-consumer'));

interface Step {
  name: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
}
const pnpm = (...args: string[]): Step => ({ name: `pnpm ${args.join(' ')}`, args });

const steps: Step[] = [
  pnpm('format:check'),
  pnpm('typecheck:scripts'),
  pnpm('sdd:check'),
  pnpm('agentyx:check'),
  pnpm('test:unit'),
  pnpm('test:components'),
  pnpm('build'),
  pnpm('pack:doq'),
  { name: `pnpm verify:package ${tarball}`, args: ['verify:package', tarball] },
  pnpm('test:contract'),
  pnpm('verify:negative-controls'),
];
if (mode === 'full') {
  steps.push(pnpm('consumer:build'), pnpm('test:e2e'), {
    name: 'pnpm verify:mvp (with tarball consumer)',
    args: ['verify:mvp'],
    env: { MVP_CONSUMER_ROOT: resolve(consumerDir, 'dist/analog/public') },
  });
}

const results: { name: string; seconds: number; ok: boolean }[] = [];
let failed = false;
for (const step of steps) {
  console.log(`\n=== ${step.name}`);
  const started = Date.now();
  const status =
    spawnSync('pnpm', step.args, { cwd: repo, stdio: 'inherit', env: { ...process.env, ...step.env } }).status ?? 1;
  results.push({ name: step.name, seconds: Math.round((Date.now() - started) / 1000), ok: status === 0 });
  if (status !== 0) {
    failed = true;
    break;
  }
}

console.log(`\nverify:${mode === 'full' ? 'full (quality:gate)' : 'change'} summary`);
for (const result of results)
  console.log(`  ${result.ok ? 'PASS' : 'FAIL'}  ${String(result.seconds).padStart(4)}s  ${result.name}`);
const skipped = steps.length - results.length;
if (skipped) console.log(`  NOT RUN  ${skipped} step(s) after the first failure`);
process.exit(failed ? 1 : 0);
