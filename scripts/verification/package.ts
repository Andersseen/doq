#!/usr/bin/env node
// Verifies the packed @doqs/analog tarball and, optionally, its installed copy in an external consumer.
// Usage: node scripts/verification/package.ts <tarball> [consumer-directory]
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const [tarballArg, consumerArg] = process.argv.slice(2);
assert.ok(tarballArg, 'Usage: package.ts <tarball> [consumer-directory]');
const tarball = resolve(tarballArg);
const { version } = JSON.parse(
  await readFile(resolve(import.meta.dirname, '../../packages/doq/package.json'), 'utf8'),
) as { version: string };
const publicNames = [
  'defineDoqConfig',
  'doqPrerenderRoutes',
  'doqPrerenderRoute',
  'provideDoq',
  'doqRoutes',
  'DoqSlots',
  'DoqPresentation',
  'DoqPaths',
  'DoqConfig',
  'DoqShellComponent',
  'DoqSearchConfig',
  'DoqSearchResult',
  'normalizeDoqSearchConfig',
  'normalizeSearchResultUrl',
];
const checks: ['PASS' | 'FAIL', string][] = [];
const pending: Promise<void>[] = [];
// A check may be asynchronous; its result keeps the position it was registered at and is awaited before reporting.
const check = (name: string, fn: () => unknown) => {
  const slot = checks.push(['FAIL', `${name}: did not finish`]) - 1;
  const settle = (error?: unknown) => {
    checks[slot] =
      error === undefined ? ['PASS', name] : ['FAIL', `${name}: ${error instanceof Error ? error.message : error}`];
  };
  try {
    const result = fn();
    if (result instanceof Promise) pending.push(result.then(() => settle(), settle));
    else settle();
  } catch (error) {
    settle(error);
  }
};

const temp = await mkdtemp(join(tmpdir(), 'doq-pack-verify-'));
try {
  execFileSync('tar', ['-xzf', tarball, '-C', temp]);
  const root = join(temp, 'package');
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const declarations = await readFile(join(root, manifest.typings), 'utf8');
  check(`tarball manifest is @doqs/analog@${version}`, () => {
    assert.equal(manifest.name, '@doqs/analog');
    assert.equal(manifest.version, version);
  });
  check('manifest has no workspace/private references', () =>
    assert.ok(!/workspace:|packages\/doq\/src/.test(JSON.stringify(manifest))),
  );
  check('exports map points at existing entries', () => {
    assert.deepEqual(
      Object.keys(manifest.exports),
      [
        '.',
        './search-index',
        './vite',
        './api-reference',
        './content',
        './styles.css',
        './package.json',
        './config',
      ].filter((key) => key in manifest.exports),
    );
    assert.ok(manifest.exports['.'].types && manifest.exports['.'].default);
    // The configuration-only entry (0.11) is a real, shipped entry point.
    assert.ok(manifest.exports['./config']?.types && manifest.exports['./config']?.default);
  });
  check('the indexer is a Node-only entry point, not part of the browser declarations', () => {
    assert.equal(manifest.exports['./search-index'].default, './bin/search-index.mjs');
    assert.deepEqual(manifest.bin, {
      doq: './bin/doq.mjs',
      'doq-search': './bin/doq-search.mjs',
      'doq-api': './bin/doq-api.mjs',
    });
    assert.ok(!/indexDoqSearch/.test(declarations));
    assert.deepEqual(manifest.peerDependenciesMeta?.pagefind, { optional: true });
    assert.ok(!manifest.dependencies?.pagefind);
  });
  check('the API reference generator is a Node-only entry point with its own declarations and CLI', async () => {
    assert.deepEqual(manifest.exports['./api-reference'], {
      types: './bin/api-reference.d.mts',
      default: './bin/api-reference.mjs',
    });
    for (const file of [
      'bin/doq-api.mjs',
      'bin/api-reference.mjs',
      'bin/api-reference.d.mts',
      'bin/api-reference/extract.mjs',
      'bin/api-reference/render.mjs',
      'bin/api-reference/output.mjs',
      'bin/api-reference/typescript.mjs',
      'bin/api-reference/errors.mjs',
    ])
      assert.ok((await readFile(join(root, file), 'utf8')).length > 0, file);
    assert.match(await readFile(join(root, 'bin/api-reference.d.mts'), 'utf8'), /generateApiReference/);
    assert.ok(!/generateApiReference|buildApiReference|checkApiReference/.test(declarations));
  });
  check(
    'the content authoring tooling is a Node-only entry point with declarations and no browser exposure',
    async () => {
      assert.deepEqual(manifest.exports['./content'], { types: './bin/content.d.mts', default: './bin/content.mjs' });
      for (const file of [
        'bin/content.mjs',
        'bin/content.d.mts',
        'bin/cli/content.mjs',
        'bin/content/compose.mjs',
        'bin/content/errors.mjs',
        'bin/content/markdown.mjs',
        'bin/content/output.mjs',
        'bin/content/paths.mjs',
        'bin/content/regions.mjs',
      ])
        assert.ok((await readFile(join(root, file), 'utf8')).length > 0, file);
      assert.match(await readFile(join(root, 'bin/content.d.mts'), 'utf8'), /generateContent/);
      assert.ok(!/generateContent|checkContent|buildContent|doqContent\b|DoqContentTarget/.test(declarations));
      // Only Node built-ins and the package's own modules: no TypeScript, Angular or Vite.
      for (const file of [
        'bin/content.mjs',
        'bin/cli/content.mjs',
        ...(await readdir(join(root, 'bin/content'))).map((f) => `bin/content/${f}`),
      ]) {
        const imports = [...(await readFile(join(root, file), 'utf8')).matchAll(/^import [^;]*? from '([^']+)'/gm)].map(
          (m) => m[1]!,
        );
        assert.deepEqual(
          imports.filter((specifier) => !/^(node:|\.\.?\/)/.test(specifier)),
          [],
          `${file} imports a dependency`,
        );
      }
    },
  );
  check('the deterministic-Markdown Vite helper is a Node-only entry point with declarations', async () => {
    assert.deepEqual(manifest.exports['./vite'], { types: './bin/vite.d.mts', default: './bin/vite.mjs' });
    assert.match(await readFile(join(root, 'bin/vite.d.mts'), 'utf8'), /doqDeterministicMarkdown/);
    assert.match(await readFile(join(root, 'bin/vite.mjs'), 'utf8'), /doqDeterministicMarkdown/);
    assert.ok(!/doqDeterministicMarkdown/.test(declarations));
    assert.ok(!manifest.dependencies?.vite && !manifest.peerDependencies?.vite);
  });
  check(
    'the doq CLI is Node-only, dependency-free, runs from the unpacked tarball and loads neither Angular nor TypeScript',
    async () => {
      const cli = [
        'bin/doq.mjs',
        'bin/cli/args.mjs',
        'bin/cli/doctor.mjs',
        'bin/cli/init.mjs',
        'bin/cli/node-support.mjs',
        'bin/cli/project.mjs',
        'bin/cli/semver.mjs',
        'bin/cli/source.mjs',
      ];
      for (const file of cli) {
        const text = await readFile(join(root, file), 'utf8');
        assert.ok(text.length > 0, file);
        const imported = ts.preProcessFile(text, true, true).importedFiles.map((entry) => entry.fileName);
        assert.deepEqual(
          imported.filter((name) => !name.startsWith('node:') && !name.startsWith('./')),
          [],
          `${file} imports a non-Node, non-local module`,
        );
      }
      assert.ok(!/doq\.mjs|doq-cli/.test(declarations), 'the CLI is not part of the browser declarations');
      assert.match(
        execFileSync(process.execPath, [join(root, 'bin/doq.mjs'), '--help'], { encoding: 'utf8' }),
        /doq init/,
      );
      assert.equal(
        execFileSync(process.execPath, [join(root, 'bin/doq.mjs'), '--version'], { encoding: 'utf8' }).trim(),
        version,
      );
    },
  );
  check('the Node-only declaration files compile under strict TypeScript', () => {
    const files = ['vite', 'api-reference', 'search-index', 'content'].map((name) =>
      join(root, 'bin', `${name}.d.mts`),
    );
    const program = ts.createProgram(files, {
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ES2022,
      types: [],
    });
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .filter((diagnostic) => diagnostic.file && files.includes(diagnostic.file.fileName));
    assert.deepEqual(
      diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')),
      [],
    );
  });
  check('the tarball ships no tests, sources, maps or fixtures', () => {
    const listed = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' }).split('\n').filter(Boolean);
    const stray = listed.filter((file) =>
      /(^|\/)(test|tests|src|e2e|fixtures)\/|\.(spec|test)\.|\.env/.test(file.replace(/^package\//, '')),
    );
    assert.deepEqual(stray, []);
  });
  check('TypeScript is an optional peer, never a dependency, and no browser bundle imports it', async () => {
    assert.deepEqual(manifest.peerDependenciesMeta?.typescript, { optional: true });
    assert.ok(!manifest.dependencies?.typescript && !manifest.devDependencies);
    for (const file of await readdir(join(root, 'fesm2022'), { recursive: true })) {
      if (!String(file).endsWith('.mjs')) continue;
      const text = await readFile(join(root, 'fesm2022', String(file)), 'utf8');
      assert.ok(
        !/from ['"](typescript|node:[a-z/]+|fs|path)['"]|require\(['"]typescript/.test(text),
        `${file} imports a Node/TypeScript module`,
      );
      assert.ok(!/ts\.createProgram|getTypeChecker/.test(text), `${file} contains compiler API calls`);
    }
  });
  for (const name of publicNames)
    check(`type declarations export ${name}`, () => assert.match(declarations, new RegExp(`\\b${name}\\b`)));
  check('declarations do not reference internal sources', () => assert.ok(!/\.\.\/src\//.test(declarations)));
  if (consumerArg) {
    const consumer = resolve(consumerArg);
    const lock = await readFile(join(consumer, 'pnpm-lock.yaml'), 'utf8').catch(() => '');
    check('consumer lockfile resolves the tarball without workspace links', () => {
      assert.ok(lock.includes(`doqs-analog-${version}.tgz`), `lockfile does not mention the ${version} tarball`);
      assert.ok(!/workspace:|link:\.\.\/doq/.test(lock));
    });
    const consumerRequire = createRequire(join(consumer, 'package.json'));
    await import(pathToFileURL(consumerRequire.resolve('@angular/compiler')).href); // partial-compiled Angular code needs the JIT facade outside a bundler
    const doq = await import(pathToFileURL(createRequire(join(consumer, 'package.json')).resolve('@doqs/analog')).href);
    const installed = JSON.parse(await readFile(join(consumer, 'node_modules/@doqs/analog/package.json'), 'utf8'));
    check(`installed package is ${version}`, () => assert.equal(installed.version, version));
    const { indexDoqSearch } = await import(
      pathToFileURL(join(consumer, 'node_modules/@doqs/analog/bin/search-index.mjs')).href
    );
    check('installed ./search-index entry exports indexDoqSearch and the doq-search binary is linked', () => {
      assert.equal(typeof indexDoqSearch, 'function');
      return readFile(join(consumer, 'node_modules/.bin/doq-search')).then(() => undefined);
    });
    const bundle = await readFile(join(consumer, 'dist/analog/public/pagefind/pagefind.js'), 'utf8').catch(() => '');
    check('the consumer build produced a search bundle with the packaged binary', () => assert.ok(bundle.length > 0));
    check('runtime exports: defineDoqConfig, doqPrerenderRoutes, doqPrerenderRoute', () => {
      for (const name of [
        'defineDoqConfig',
        'doqPrerenderRoutes',
        'doqPrerenderRoute',
        'provideDoq',
        'doqRoutes',
        'DoqShellComponent',
      ])
        assert.equal(typeof doq[name], 'function', name);
    });
    check('doqPrerenderRoutes honours custom basePath, nested paths and custom slugs', () => {
      const [index, content] = doq.doqPrerenderRoutes({ contentDirectory: '/guides/', basePath: 'handbook/' });
      assert.equal(index, '/handbook');
      assert.equal(content.contentDir, 'src/content/guides');
      assert.equal(content.recursive, true);
      assert.equal(
        content.transform({ name: 'button', relativePath: 'components', attributes: {} }),
        '/handbook/components/button',
      );
      assert.equal(content.transform({ name: 'index', relativePath: 'guides', attributes: {} }), '/handbook/guides');
      assert.equal(
        content.transform({
          name: 'getting-started',
          relativePath: '',
          attributes: { slug: 'onboarding/first-application' },
        }),
        '/handbook/onboarding/first-application',
      );
      assert.throws(() => content.transform({ name: 'bad', attributes: { slug: ' ' } }), /empty slug/);
    });
    check('defineDoqConfig normalizes paths and rejects invalid ones', () => {
      const config = doq.defineDoqConfig({ contentDirectory: '/docs/', basePath: 'help', sidebar: 'right' });
      assert.deepEqual([config.contentDirectory, config.basePath, config.sidebar], ['docs', '/help', 'right']);
      assert.equal(doq.defineDoqConfig({ contentDirectory: 'docs' }).basePath, '/docs');
      assert.throws(() => doq.defineDoqConfig({ contentDirectory: '' }), /contentDirectory/);
      assert.equal(
        doq.defineDoqConfig({ contentDirectory: 'docs', basePath: '/' }).basePath,
        '/',
        'basePath "/" mounts docs at the root',
      );
      assert.throws(() => doq.defineDoqConfig({ contentDirectory: 'docs', basePath: '' }), /basePath/);
      assert.throws(() => doq.defineDoqConfig({ contentDirectory: '../x' }), /contentDirectory/);
    });
    check('doqRoutes uses the configured base path', () => {
      const routes = doq.doqRoutes({ basePath: '/help' });
      assert.equal(routes.length, 2);
    });
  }
  await Promise.all(pending);
} finally {
  await rm(temp, { recursive: true, force: true });
}
for (const [status, name] of checks) console.log(`${status} ${name}`);
const failed = checks.filter(([status]) => status === 'FAIL').length;
console.log(`\nPackage summary: ${checks.length - failed} PASS / ${failed} FAIL`);
process.exitCode = failed ? 1 : 0;
