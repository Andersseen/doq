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
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
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
// API reference (Doqs 0.5): generated from the real public entry point with the checkout's own TypeScript, then
// proven stale-sensitive. The checkout is disposable; nothing is committed to the Angular Movement repository.
const apiArgs = [
  '--project',
  'projects/movement/tsconfig.lib.json',
  '--entry',
  'projects/movement/src/public-api.ts',
  '--content-dir',
  'src/content/handbook',
  '--out',
  'src/content/handbook/api',
  '--base-path',
  '/handbook',
  '--group',
  'API reference',
  '--title',
  'Movement API reference',
];
const doqApi = (command: 'generate' | 'check', extraArgs = apiArgs) => {
  const started = Date.now();
  const result = spawnSync('pnpm', ['exec', 'doq-api', command, ...extraArgs], { cwd: outDir, encoding: 'utf8' });
  console.log(
    `adoption: doq-api ${command} exit ${result.status} in ${Date.now() - started} ms\n${result.stdout}${result.stderr}`,
  );
  return result;
};
const expectStatus = (what: string, actual: number | null, expected: number) => {
  if (actual !== expected) throw new Error(`adoption: ${what}: expected exit ${expected}, got ${actual}`);
};
const typescriptVersion = spawnSync('pnpm', ['exec', 'tsc', '--version'], {
  cwd: outDir,
  encoding: 'utf8',
}).stdout.trim();
console.log(`adoption: checkout compiler: ${typescriptVersion}`);
expectStatus('generate', doqApi('generate').status, 0);
expectStatus('check right after generate', doqApi('check').status, 0);
// Versioned documentation (Doqs 0.6): a GENUINE historical source. The upstream tag below is cloned, its library project is
// placed next to the current one and documented by the same installed doq-api into a separate archive directory. Nothing is
// invented: the archive's generated pages are whatever that tag's public API really was.
const archiveRef = process.env['AM_ARCHIVE_REF'] ?? 'v0.9.0';
const history = resolve(outDir, '..', `${outDir.split('/').pop()}-history`);
await rm(history, { recursive: true, force: true });
run('git', ['clone', '--depth', '1', '--branch', archiveRef, source, history], repo);
await cp(resolve(history, 'projects/movement'), resolve(outDir, 'projects/movement-v0-9'), {
  recursive: true,
  filter: (path) => !path.includes('node_modules'),
});
await rm(history, { recursive: true, force: true });
const archiveApiArgs = [
  '--project',
  'projects/movement-v0-9/tsconfig.lib.json',
  '--entry',
  'projects/movement-v0-9/src/public-api.ts',
  '--content-dir',
  'src/content/handbook-v0-9',
  '--out',
  'src/content/handbook-v0-9/api',
  '--base-path',
  '/handbook/v/0.9',
  '--group',
  'API reference',
  '--title',
  'Movement API reference',
];
expectStatus('archive generate', doqApi('generate', archiveApiArgs).status, 0);
expectStatus('archive check', doqApi('check', archiveApiArgs).status, 0);
const archiveManifest = resolve(outDir, 'src/content/handbook-v0-9/api/.doq-api.json');
const archiveBefore = await readFile(archiveManifest, 'utf8');
const provide = resolve(outDir, 'projects/movement/src/lib/providers/provide-movement.ts');
const original = await readFile(provide, 'utf8');
const changed = original.replace(
  'export function provideMovement(config: MovementConfigInput = {}): EnvironmentProviders',
  'export function provideMovement(config: MovementConfigInput = {}, label?: string): EnvironmentProviders',
);
if (changed === original)
  throw new Error('adoption: provideMovement signature changed upstream; update the stale-check probe.');
await writeFile(provide, changed);
const stale = doqApi('check');
expectStatus('check after a public API change', stale.status, 1);
if (!/modified\s+provide-movement\.md/.test(stale.stderr))
  throw new Error('adoption: stale check did not name provide-movement.md');
expectStatus('generate after the change', doqApi('generate').status, 0);
expectStatus('check after regeneration', doqApi('check').status, 0);
await writeFile(provide, original);
expectStatus('generate after restoring the source', doqApi('generate').status, 0);
expectStatus('check after restoring the source', doqApi('check').status, 0);
// Regenerating the current reference never touches the archive's pages or manifest, and the archive still checks clean.
if ((await readFile(archiveManifest, 'utf8')) !== archiveBefore)
  throw new Error('adoption: current regeneration changed the archive manifest');
expectStatus('archive check after current regeneration', doqApi('check', archiveApiArgs).status, 0);

// Known upstream issue (docs/guides/angular-movement-migration.md, "Known limits"): Analog 2.9's shared heading slugger
// intermittently gives a page numeric suffixes (`usage-2`) in one of the two bundles. It is independent of Doqs, so the
// proof rebuilds (up to twelve times; roughly half of the builds hit it once the checkout holds two handbooks) until the prerendered ids are canonical instead of hiding the problem in the tests.
const headingIdsAreCanonical = async () => {
  const publicDir = resolve(outDir, 'dist/analog/public');
  const html = await readFile(resolve(publicDir, 'handbook/introduction/index.html'), 'utf8');
  if (!/<h2 id="why-angular-movement"/.test(html) || !/<h2 id="usage-1"/.test(html)) return false;
  // The browser bundle can be wrong while the prerendered HTML is right: look for suffixed ids in its chunks too.
  for (const file of await readdir(resolve(publicDir, 'assets'), { recursive: true })) {
    if (!String(file).endsWith('.js')) continue;
    if ((await readFile(resolve(publicDir, 'assets', String(file)), 'utf8')).includes('id="why-angular-movement-1"'))
      return false;
  }
  return true;
};
for (let attempt = 1; ; attempt++) {
  run('pnpm', ['run', 'build'], outDir);
  if (await headingIdsAreCanonical()) break;
  console.log(`adoption: build ${attempt} hit the upstream heading-id race (non-canonical ids)`);
  if (attempt === 12) throw new Error('adoption: twelve builds in a row produced non-canonical heading ids');
}
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
