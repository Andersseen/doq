/**
 * Volt UI adoption proof (Doqs 0.11): the packed @doqs/analog tarball renders documentation pages of the real Volt UI site at
 * their original URLs (/docs/components/{button,dialog,popover,select}, /docs/customization, /docs/recipes/async-search) with
 * REAL Volt UI components in playgrounds, while the gallery, Theme Studio, localized routes and every other page stay host-owned.
 *
 *   node scripts/adoption-volt.ts [outDir] [--test]   --test also runs e2e/adoption-volt.spec.ts against the result
 *
 * A disposable clone of the public repository plus the overlay in tests/adoption/volt-ui; nothing is pushed anywhere and the
 * checkout lives outside this repository. VU_REPO / VU_REF override the source. Needs network access (the clone, and Volt UI's
 * own build fetches its translation catalogs from its Glossa service). For the proof the Nitro preset is the default Node one
 * (the Cloudflare packaging is the host's business) and the routes under test are prerendered.
 */
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const overlay = resolve(repo, 'tests/adoption/volt-ui');
const { version } = JSON.parse(await readFile(resolve(repo, 'packages/doq/package.json'), 'utf8')) as {
  version: string;
};
const tarball = resolve(repo, `artifacts/doqs-analog-${version}.tgz`);
const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const outDir = resolve(args[0] ?? process.env['DOQ_ADOPTION_VOLT_DIR'] ?? resolve(tmpdir(), 'doq-adoption-volt-ui'));
if (outDir === repo || outDir.startsWith(`${repo}/`))
  throw new Error(`The proof must live outside the repository: ${outDir}`);
await readFile(tarball).catch(() => {
  throw new Error(`Tarball not found: ${tarball}. Run "pnpm pack:doq" first.`);
});

const run = (command: string, commandArgs: string[], cwd: string) => {
  console.log(`adoption-volt: ${command} ${commandArgs.join(' ')}`);
  const result = spawnSync(command, commandArgs, { cwd, stdio: 'inherit', env: { ...process.env, CI: 'true' } });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const edit = async (file: string, change: (text: string) => string) => {
  const path = resolve(outDir, file);
  const before = await readFile(path, 'utf8');
  const after = change(before);
  if (after === before) throw new Error(`Overlay patch for ${file} changed nothing; Volt UI's layout may have moved.`);
  await writeFile(path, after);
};
const expectStatus = (what: string, actual: number | null, expected: number) => {
  if (actual !== expected) throw new Error(`adoption-volt: ${what}: expected exit ${expected}, got ${actual}`);
};

await rm(outDir, { recursive: true, force: true });
await mkdir(resolve(outDir, '..'), { recursive: true });
const source = process.env['VU_REPO'] ?? 'https://github.com/Andersseen/volt-ui.git';
run(
  'git',
  ['clone', '--depth', '1', ...(process.env['VU_REF'] ? ['--branch', process.env['VU_REF']] : []), source, outDir],
  repo,
);
const sha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: outDir, encoding: 'utf8' }).stdout.trim();
console.log(`adoption-volt: Volt UI checkout ${sha}`);
await writeFile(resolve(outDir, '.doq-adoption-sha'), `${sha}\n`);

run('pnpm', ['install', '--ignore-scripts'], outDir);
run('pnpm', ['add', `file:${tarball}`, '@analogjs/content@^2.9.1', 'pagefind@1.5.2', '--ignore-scripts'], outDir);

// The pages Doqs replaces, at the same URLs. Everything else is exactly as upstream wrote it.
const components = 'src/app/pages/(components-docs)/docs/components';
const migrated = [
  `${components}/button.page.ts`,
  `${components}/button.component.html`,
  `${components}/dialog.page.ts`,
  `${components}/dialog.component.html`,
  `${components}/popover.page.ts`,
  `${components}/popover.component.html`,
  `${components}/select.page.ts`,
  `${components}/select.component.html`,
  'src/app/pages/(getting-started)/docs/customization.page.ts',
  'src/app/pages/(components-docs)/docs/recipes/async-search.page.ts',
];
for (const file of migrated) await rm(resolve(outDir, file));

await cp(resolve(overlay, 'src'), resolve(outDir, 'src'), { recursive: true });

// Routes verified by the proof: migrated Doqs pages plus host-owned neighbours (a non-migrated component, a gallery page,
// Theme Studio, an introduction page, a localized page).
const hostRoutes = [
  '/',
  '/docs/introduction',
  '/docs/components',
  '/docs/components/switch',
  '/docs/blocks/hero',
  '/docs/layouts/login',
  '/create-theme',
  '/es/docs/components/switch',
  // Probe: a locale-prefixed URL of a MIGRATED page. Doqs has no localized documents, so this records what the host serves.
  '/es/docs/components/button',
];
await edit('vite.config.ts', (text) =>
  text
    .replace(
      "import { readFileSync } from 'fs';",
      "import { readFileSync } from 'fs';\nimport { doqPrerenderRoutes } from '@doqs/analog/config';\nimport { doqDeterministicMarkdown } from '@doqs/analog/vite';\nimport { doqPaths } from './src/doq.paths.ts';",
    )
    // Analog's Markdown pre-bundling hint is irrelevant now that the site has Markdown content.
    .replace('    noMarkdownDepsPlugin(),\n', '')
    .replace(
      "      ssr: true,\n      nitro: {\n        preset: 'cloudflare-pages',",
      `      ssr: true,\n      content: { highlighter: 'prism' },\n      prerender: { routes: async () => [${hostRoutes.map((route) => `'${route}'`).join(', ')}, ...doqPrerenderRoutes(doqPaths)] },\n      nitro: {\n        preset: 'node-server',`,
    )
    .replace('    }),\n  ],\n  resolve: {', '    }),\n    doqDeterministicMarkdown(),\n  ],\n  resolve: {'),
);
await edit('src/app/app.config.ts', (text) =>
  text
    .replace(
      "import { provideFileRouter } from '@analogjs/router';",
      "import { provideFileRouter, withExtraRoutes } from '@analogjs/router';\nimport { provideContent, withMarkdownRenderer } from '@analogjs/content';\nimport { doqRoutes, provideDoq } from '@doqs/analog';\nimport { doqConfig } from './doq-integration';",
    )
    // Order matters: withLocalizedRoutes() is itself an extra-route catch-all over every file route (Analog's own Markdown routes
    // for src/content included), so Doqs's routes have to come first or Analog's raw Markdown route answers the URL.
    .replace(
      'provideFileRouter(withLocalizedRoutes()),',
      'provideFileRouter(withExtraRoutes(doqRoutes(doqConfig)), withLocalizedRoutes()),\n    provideContent(withMarkdownRenderer()),\n    provideDoq(doqConfig),',
    ),
);
const append = await readFile(resolve(overlay, 'styles.append.css'), 'utf8');
await edit(
  'src/styles.css',
  (text) =>
    `${text.replace("@import 'tailwindcss';\n", "@import 'tailwindcss';\n@import '@doqs/analog/styles.css';\n")}\n${append}`,
);

// API reference for the library's public entry point, generated with the checkout's own TypeScript.
const apiArgs = [
  '--project',
  'projects/volt/tsconfig.lib.json',
  '--entry',
  'projects/volt/src/public-api.ts',
  '--content-dir',
  'src/content/docs',
  '--out',
  'src/content/docs/api',
  '--base-path',
  '/docs',
  '--group',
  'API reference',
  '--title',
  'Volt UI API reference',
];
const doqApi = (command: 'generate' | 'check') =>
  spawnSync('pnpm', ['--silent', 'exec', 'doq-api', command, ...apiArgs], { cwd: outDir, encoding: 'utf8' });
const generated = doqApi('generate');
console.log((generated.stdout + generated.stderr).split('\n').slice(0, 12).join('\n'));
expectStatus('doq-api generate', generated.status, 0);
expectStatus('doq-api check', doqApi('check').status, 0);

await writeFile(
  resolve(outDir, 'doq.content.json'),
  `${JSON.stringify(
    {
      targets: [
        {
          name: 'docs',
          authoring: 'src/authoring/docs',
          out: 'src/content/docs',
          sourceRoots: ['projects/volt/src', 'src/app/recipes'],
          api: ['src/content/docs/api'],
        },
      ],
    },
    null,
    2,
  )}\n`,
);
const content = spawnSync('pnpm', ['--silent', 'exec', 'doq', 'content', 'generate'], {
  cwd: outDir,
  encoding: 'utf8',
});
console.log(content.stdout + content.stderr);
expectStatus('doq content generate', content.status, 0);

// Volt UI's own prebuild steps, then its build, then the Pagefind index of the prerendered output.
run('node', ['cli/generate-manifest.js'], outDir);
run('node', ['scripts/generate-site-stats.mjs'], outDir);
const started = Date.now();
run('pnpm', ['exec', 'vite', 'build'], outDir);
console.log(`adoption-volt: vite build ${Math.round((Date.now() - started) / 1000)} s`);
run('pnpm', ['exec', 'doq-search', 'index', 'dist/analog/public'], outDir);
run(
  'node',
  [
    'scripts/docs-check.ts',
    `--dist=${resolve(outDir, 'dist/analog/public')}`,
    `--source=${outDir}`,
    '--link-scope=/docs/api',
  ],
  repo,
);
const doctor = spawnSync('pnpm', ['--silent', 'exec', 'doq', 'doctor', '--build', '--json'], {
  cwd: outDir,
  encoding: 'utf8',
});
const report = JSON.parse(doctor.stdout) as { summary: { FAIL: number }; findings: { id: string; status: string }[] };
if (report.summary.FAIL !== 0)
  throw new Error(`adoption-volt: doctor FAIL: ${JSON.stringify(report.findings.filter((f) => f.status === 'FAIL'))}`);
console.log(`adoption-volt: ready ${resolve(outDir, 'dist/analog/public')} (Volt UI ${sha})`);

if (process.argv.includes('--test')) {
  const result = spawnSync('pnpm', ['exec', 'playwright', 'test', 'e2e/adoption-volt.spec.ts'], {
    cwd: repo,
    stdio: 'inherit',
    env: {
      ...process.env,
      DOQ_ADOPTION_VOLT_DIR: outDir,
      PLAYWRIGHT_BROWSERS_PATH: process.env['PLAYWRIGHT_BROWSERS_PATH'] ?? '0',
    },
  });
  process.exit(result.status ?? 1);
}
