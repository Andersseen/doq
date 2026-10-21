/**
 * Builds the Angular Movement adoption proof: a disposable checkout of the real Angular Movement site with
 * the packed @doqs/analog tarball and a /handbook documentation region added next to its existing /docs.
 *
 *   node scripts/adoption.ts [outDir] [--test]   --test also runs e2e/adoption.spec.ts against the result
 *
 * Nothing is pushed anywhere and the checkout lives outside this repository. The overlay is
 * tests/adoption/angular-movement; AM_REPO / AM_REF override the source (default: the public repository's default branch).
 * Needs network access to clone the repository.
 */
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const overlay = resolve(repo, 'tests/adoption/angular-movement');
const { version } = JSON.parse(await readFile(resolve(repo, 'packages/doq/package.json'), 'utf8')) as {
  version: string;
};
const tarball = resolve(repo, `artifacts/doqs-analog-${version}.tgz`);
const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const outDir = resolve(
  args[0] ?? process.env['DOQ_ADOPTION_DIR'] ?? resolve(tmpdir(), 'doq-adoption-angular-movement'),
);
if (outDir === repo || outDir.startsWith(`${repo}/`))
  throw new Error(`The proof must live outside the repository: ${outDir}`);
await readFile(tarball).catch(() => {
  throw new Error(`Tarball not found: ${tarball}. Run "pnpm pack:doq" first.`);
});

const run = (command: string, args: string[], cwd: string) => {
  console.log(`adoption: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: { ...process.env, CI: 'true' } });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const edit = async (file: string, change: (text: string) => string) => {
  const path = resolve(outDir, file);
  const before = await readFile(path, 'utf8');
  const after = change(before);
  if (after === before)
    throw new Error(`Overlay patch for ${file} changed nothing; Angular Movement's layout may have moved.`);
  await writeFile(path, after);
};

await rm(outDir, { recursive: true, force: true });
await mkdir(resolve(outDir, '..'), { recursive: true });
const source = process.env['AM_REPO'] ?? 'https://github.com/Andersseen/angular-movement.git';
run(
  'git',
  ['clone', '--depth', '1', ...(process.env['AM_REF'] ? ['--branch', process.env['AM_REF']] : []), source, outDir],
  repo,
);
const sha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: outDir, encoding: 'utf8' }).stdout.trim();
console.log(`adoption: Angular Movement checkout ${sha}`);

await cp(resolve(overlay, 'src'), resolve(outDir, 'src'), { recursive: true });
await edit('vite.config.ts', (text) =>
  text
    .replace(
      "import { resolve } from 'path';",
      "import { resolve } from 'path';\nimport { doqPrerenderRoutes } from '@doqs/analog';\nimport { doqPaths } from './src/doq.paths';",
    )
    .replace('content: {\n        prismOptions', "content: {\n        highlighter: 'prism',\n        prismOptions")
    .replace(
      '      ssr: true,\n',
      "      ssr: true,\n      prerender: { routes: async () => ['/', '/docs/introduction', '/demos/enter', ...doqPrerenderRoutes(doqPaths)] },\n",
    ),
);
const append = await readFile(resolve(overlay, 'styles.append.css'), 'utf8');
await edit(
  'src/styles.css',
  (text) =>
    `${text.replace("@import 'tailwindcss';\n", "@import 'tailwindcss';\n@import '@doqs/analog/styles.css';\n")}\n${append}`,
);
await edit('package.json', (text) =>
  text.replace(
    '"build": "pnpm exec vite build"',
    '"build": "pnpm exec vite build && doq-search index dist/analog/public"',
  ),
);

run('pnpm', ['install', '--ignore-scripts', '--no-frozen-lockfile'], outDir);
run('pnpm', ['add', `file:${tarball}`, 'pagefind@1.5.2', '--ignore-scripts'], outDir);
run('pnpm', ['run', 'build'], outDir);
console.log(`adoption: ready ${resolve(outDir, 'dist/analog/public')} (Angular Movement ${sha})`);

if (process.argv.includes('--test')) {
  const result = spawnSync('pnpm', ['exec', 'playwright', 'test', 'e2e/adoption.spec.ts'], {
    cwd: repo,
    stdio: 'inherit',
    env: {
      ...process.env,
      DOQ_ADOPTION_DIR: outDir,
      PLAYWRIGHT_BROWSERS_PATH: process.env['PLAYWRIGHT_BROWSERS_PATH'] ?? '0',
    },
  });
  process.exit(result.status ?? 1);
}
