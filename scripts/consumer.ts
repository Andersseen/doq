/**
 * Builds an independent consumer of the packed @doqs/analog tarball.
 *
 * The consumer is a copy of a showcase's sources with its own manifest and lockfile, installed outside
 * this workspace from the tarball (`file:`), so nothing resolves through `workspace:` links or library sources.
 * Showcase B (docs-first, mounted at the root) is the default; `--app=showcase-a` builds the embedded scenario
 * (documentation under /docs inside a host site). `--unversioned` strips the versioning configuration and the archive
 * fixtures, which reproduces a Doqs 0.5-style consumer that must keep working unchanged on 0.6.
 *
 *   node scripts/consumer.ts [tarball] [outDir] [--app=showcase-a|showcase-b] [--unversioned]
 *
 * Defaults: artifacts/doqs-analog-<version>.tgz and, for outDir, $DOQ_CONSUMER_DIR (B) or $DOQ_CONSUMER_A_DIR (A),
 * else <tmp>/doq-e2e-consumer or <tmp>/doq-e2e-consumer-a. The static output is written to <outDir>/dist/analog/public.
 */
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { writeDocsFixture } from './fixtures/docs.ts';

const repo = resolve(import.meta.dirname, '..');
const flags = process.argv.slice(2).filter((arg) => arg.startsWith('--'));
const positional = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const app = flags.find((flag) => flag.startsWith('--app='))?.slice('--app='.length) ?? 'showcase-b';
if (app !== 'showcase-a' && app !== 'showcase-b') throw new Error(`Unknown --app=${app}`);
const source = resolve(repo, `apps/${app}`);
const { version } = JSON.parse(await readFile(resolve(repo, 'packages/doq/package.json'), 'utf8')) as {
  version: string;
};
const unversioned = flags.includes('--unversioned');
// --stress=<n>: add n generated documents (with duplicate headings and rich Markdown) to the current docs and to each archive.
const stress = Number(flags.find(flag => flag.startsWith('--stress='))?.slice('--stress='.length) ?? 0);
const skipApi = flags.includes('--skip-api');
// --slow-markdown: add an asynchronous marked step, like Shiki's, so Markdown renders really interleave (determinism stress).
// --without-deterministic-markdown: the control; remove the guard from vite.config.ts.
const slowMarkdown = flags.includes('--slow-markdown');
const withoutGuard = flags.includes('--without-deterministic-markdown');
const tarball = resolve(positional[0] ?? `artifacts/doqs-analog-${version}.tgz`);
const outDir = resolve(
  positional[1] ??
    (unversioned
      ? app === 'showcase-a'
        ? (process.env['DOQ_CONSUMER_LEGACY_A_DIR'] ?? resolve(tmpdir(), 'doq-e2e-consumer-legacy-a'))
        : (process.env['DOQ_CONSUMER_LEGACY_B_DIR'] ?? resolve(tmpdir(), 'doq-e2e-consumer-legacy-b'))
      : app === 'showcase-a'
        ? (process.env['DOQ_CONSUMER_A_DIR'] ?? resolve(tmpdir(), 'doq-e2e-consumer-a'))
        : (process.env['DOQ_CONSUMER_DIR'] ?? resolve(tmpdir(), 'doq-e2e-consumer'))),
);

if (outDir === repo || outDir.startsWith(`${repo}/`))
  throw new Error(`The consumer must live outside the repository: ${outDir}`);
await readFile(tarball).catch(() => {
  throw new Error(`Tarball not found: ${tarball}. Run "pnpm pack:doq" first.`);
});

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const skip = new Set(['node_modules', 'dist', '.turbo', '.angular', 'AGENTS.md', 'CLAUDE.md']);
await cp(source, outDir, { recursive: true, filter: (path) => !skip.has(path.split('/').pop() ?? '') });

if (unversioned) {
  // A 0.5-style configuration: only contentDirectory and basePath, no archives, no versioned fixtures.
  const basePath = app === 'showcase-a' ? '/docs' : '/';
  await writeFile(
    resolve(outDir, 'src/doq.paths.ts'),
    `export const doqPaths = {\n  contentDirectory: 'docs',\n  basePath: '${basePath}',\n} as const;\n`,
  );
  for (const archive of ['src/content/docs-v1', 'vanta-ui-v1', 'forge-sdk-v1'])
    await rm(resolve(outDir, archive), { recursive: true, force: true });
}

if (stress > 0) {
  const demo = app === 'showcase-a' ? 'vanta-button' : 'forge-schema';
  await writeDocsFixture(resolve(outDir, 'src/content/docs'), { count: stress, demo, label: 'current' });
  if (!unversioned) {
    await writeDocsFixture(resolve(outDir, 'src/content/docs-v1'), { count: Math.ceil(stress / 2), demo, label: 'archive' });
  }
}

if (slowMarkdown || withoutGuard) {
  const configFile = resolve(outDir, 'vite.config.ts');
  let config = await readFile(configFile, 'utf8');
  if (withoutGuard) config = config.replace(/import \{ doqDeterministicMarkdown \}[^\n]*\n/, '').replace(/\s*\/\/ Renders Markdown one file[^\n]*\n\s*doqDeterministicMarkdown\(\),/, '');
  if (slowMarkdown) {
    config = config.replace(
      "content: { highlighter: 'prism' }",
      "content: { highlighter: 'prism', markedOptions: { extensions: [{ async: true, walkTokens: () => new Promise<void>(done => setTimeout(done, 1)) }] } }",
    );
  }
  await writeFile(configFile, config);
}

const manifest = JSON.parse(await readFile(resolve(source, 'package.json'), 'utf8'));
manifest.name = `${app === 'showcase-a' ? 'doq-external-consumer-embedded' : 'doq-external-consumer'}${unversioned ? '-unversioned' : ''}`;
manifest.dependencies['@doqs/analog'] = `file:${tarball}`;
manifest.scripts = {
  ...Object.fromEntries(Object.entries(manifest.scripts).filter(([name]) => name.startsWith('api'))),
  build: 'vite build && doq-search index dist/analog/public',
};
if (unversioned) {
  for (const name of Object.keys(manifest.scripts)) if (name.endsWith(':v1')) delete manifest.scripts[name];
  manifest.scripts['api'] = manifest.scripts['api:latest'];
  manifest.scripts['api:check'] = manifest.scripts['api:check:latest'];
}
await writeFile(resolve(outDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const pnpm = (args: string[], expected = 0) => {
  console.log(`consumer: pnpm ${args.join(' ')}`);
  const result = spawnSync('pnpm', args, { cwd: outDir, stdio: 'inherit', env: { ...process.env, CI: 'true' } });
  if (result.status !== expected) {
    console.error(`consumer: "pnpm ${args.join(' ')}" exited ${result.status}, expected ${expected}`);
    process.exit(1);
  }
};
pnpm(['install']);
if (skipApi) {
  pnpm(['build']);
  console.log(`consumer ready: ${resolve(outDir, 'dist/analog/public')}`);
  process.exit(0);
}

// API reference through the installed `doq-api` binary and the consumer's own TypeScript: the committed pages must be
// current, a public API change must make `check` fail until `generate` runs, and regenerating restores the pages.
const entry = resolve(outDir, app === 'showcase-a' ? 'vanta-ui/src/public-api.ts' : 'forge-sdk/src/public-api.ts');
const original = await readFile(entry, 'utf8');
pnpm(['run', 'api:check']);
await writeFile(entry, `${original}\n/** Added by the consumer proof. */\nexport const consumerProbe = 1;\n`);
pnpm(['run', 'api:check'], 1);
pnpm(['run', 'api']);
pnpm(['run', 'api:check']);
await writeFile(entry, original);
pnpm(['run', 'api']);
pnpm(['run', 'api:check']);

pnpm(['build']);
console.log(`consumer ready: ${resolve(outDir, 'dist/analog/public')}`);
