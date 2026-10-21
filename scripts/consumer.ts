/**
 * Builds an independent consumer of the packed @getdoq/analog tarball.
 *
 * The consumer is a copy of Showcase B's sources with its own manifest and lockfile, installed outside
 * this workspace from the tarball (`file:`), so nothing resolves through `workspace:` links or library sources.
 *
 *   node scripts/consumer.ts [tarball] [outDir]
 *
 * Defaults: artifacts/getdoq-analog-<version>.tgz and $DOQ_CONSUMER_DIR or <tmp>/doq-e2e-consumer.
 * The static output is written to <outDir>/dist/analog/public.
 */
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const source = resolve(repo, 'apps/showcase-b');
const { version } = JSON.parse(await readFile(resolve(repo, 'packages/doq/package.json'), 'utf8')) as {
  version: string;
};
const tarball = resolve(process.argv[2] ?? `artifacts/getdoq-analog-${version}.tgz`);
const outDir = resolve(process.argv[3] ?? process.env['DOQ_CONSUMER_DIR'] ?? resolve(tmpdir(), 'doq-e2e-consumer'));

if (outDir === repo || outDir.startsWith(`${repo}/`))
  throw new Error(`The consumer must live outside the repository: ${outDir}`);
await readFile(tarball).catch(() => {
  throw new Error(`Tarball not found: ${tarball}. Run "pnpm pack:doq" first.`);
});

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const skip = new Set(['node_modules', 'dist', '.turbo', '.angular', 'AGENTS.md', 'CLAUDE.md']);
await cp(source, outDir, { recursive: true, filter: (path) => !skip.has(path.split('/').pop() ?? '') });

const manifest = JSON.parse(await readFile(resolve(source, 'package.json'), 'utf8'));
manifest.name = 'doq-external-consumer';
manifest.dependencies['@getdoq/analog'] = `file:${tarball}`;
manifest.scripts = { build: 'vite build' };
await writeFile(resolve(outDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);

for (const args of [['install'], ['build']]) {
  console.log(`consumer: pnpm ${args.join(' ')}`);
  const result = spawnSync('pnpm', args, { cwd: outDir, stdio: 'inherit', env: { ...process.env, CI: 'true' } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`consumer ready: ${resolve(outDir, 'dist/analog/public')}`);
