#!/usr/bin/env node
// Verifies the packed @getdoq/analog tarball and, optionally, its installed copy in an external consumer.
// Usage: node scripts/verification/package.mjs <tarball> [consumer-directory]
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const [tarballArg, consumerArg] = process.argv.slice(2);
assert.ok(tarballArg, 'Usage: package.mjs <tarball> [consumer-directory]');
const tarball = resolve(tarballArg);
const publicNames = ['defineDoqConfig', 'doqPrerenderRoutes', 'doqPrerenderRoute', 'provideDoq', 'doqRoutes', 'DoqSlots', 'DoqPresentation', 'DoqPaths', 'DoqConfig', 'DoqShellComponent'];
const checks = [];
const check = (name, fn) => { try { fn(); checks.push(['PASS', name]); } catch (error) { checks.push(['FAIL', `${name}: ${error.message}`]); } };

const temp = await mkdtemp(join(tmpdir(), 'doq-pack-verify-'));
try {
  execFileSync('tar', ['-xzf', tarball, '-C', temp]);
  const root = join(temp, 'package');
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const declarations = await readFile(join(root, manifest.typings), 'utf8');
  check('tarball manifest is @getdoq/analog@0.1.0', () => { assert.equal(manifest.name, '@getdoq/analog'); assert.equal(manifest.version, '0.1.0'); });
  check('manifest has no workspace/private references', () => assert.ok(!/workspace:|packages\/doq\/src/.test(JSON.stringify(manifest))));
  check('exports map points at existing entries', () => { assert.deepEqual(Object.keys(manifest.exports), ['.', './styles.css', './package.json'].filter(key => key in manifest.exports)); assert.ok(manifest.exports['.'].types && manifest.exports['.'].default); });
  for (const name of publicNames) check(`type declarations export ${name}`, () => assert.match(declarations, new RegExp(`\\b${name}\\b`)));
  check('declarations do not reference internal sources', () => assert.ok(!/\.\.\/src\//.test(declarations)));
  if (consumerArg) {
    const consumer = resolve(consumerArg);
    const lock = await readFile(join(consumer, 'pnpm-lock.yaml'), 'utf8').catch(() => '');
    check('consumer lockfile resolves the tarball without workspace links', () => { assert.ok(lock.includes('getdoq-analog-0.1.0.tgz'), 'lockfile does not mention the 0.1.0 tarball'); assert.ok(!/workspace:|link:\.\.\/doq/.test(lock)); });
    const consumerRequire = createRequire(join(consumer, 'package.json'));
    await import(pathToFileURL(consumerRequire.resolve('@angular/compiler')).href); // partial-compiled Angular code needs the JIT facade outside a bundler
    const doq = await import(pathToFileURL(createRequire(join(consumer, 'package.json')).resolve('@getdoq/analog')).href);
    const installed = JSON.parse(await readFile(join(consumer, 'node_modules/@getdoq/analog/package.json'), 'utf8'));
    check('installed package is 0.1.0', () => assert.equal(installed.version, '0.1.0'));
    check('runtime exports: defineDoqConfig, doqPrerenderRoutes, doqPrerenderRoute', () => { for (const name of ['defineDoqConfig', 'doqPrerenderRoutes', 'doqPrerenderRoute', 'provideDoq', 'doqRoutes', 'DoqShellComponent']) assert.equal(typeof doq[name], 'function', name); });
    check('doqPrerenderRoutes honours custom basePath, nested paths and custom slugs', () => {
      const [index, content] = doq.doqPrerenderRoutes({ contentDirectory: '/guides/', basePath: 'handbook/' });
      assert.equal(index, '/handbook');
      assert.equal(content.contentDir, 'src/content/guides'); assert.equal(content.recursive, true);
      assert.equal(content.transform({ name: 'button', relativePath: 'components', attributes: {} }), '/handbook/components/button');
      assert.equal(content.transform({ name: 'index', relativePath: 'guides', attributes: {} }), '/handbook/guides');
      assert.equal(content.transform({ name: 'getting-started', relativePath: '', attributes: { slug: 'onboarding/first-application' } }), '/handbook/onboarding/first-application');
      assert.throws(() => content.transform({ name: 'bad', attributes: { slug: ' ' } }), /empty slug/);
    });
    check('defineDoqConfig normalizes paths and rejects invalid ones', () => {
      const config = doq.defineDoqConfig({ contentDirectory: '/docs/', basePath: 'help', sidebar: 'right' });
      assert.deepEqual([config.contentDirectory, config.basePath, config.sidebar], ['docs', '/help', 'right']);
      assert.equal(doq.defineDoqConfig({ contentDirectory: 'docs' }).basePath, '/docs');
      assert.throws(() => doq.defineDoqConfig({ contentDirectory: '' }), /contentDirectory/);
      assert.throws(() => doq.defineDoqConfig({ contentDirectory: 'docs', basePath: '/' }), /basePath/);
      assert.throws(() => doq.defineDoqConfig({ contentDirectory: '../x' }), /contentDirectory/);
    });
    check('doqRoutes uses the configured base path', () => { const routes = doq.doqRoutes({ basePath: '/help' }); assert.equal(routes.length, 2); });
  }
} finally { await rm(temp, { recursive: true, force: true }); }
for (const [status, name] of checks) console.log(`${status} ${name}`);
const failed = checks.filter(([status]) => status === 'FAIL').length;
console.log(`\nPackage summary: ${checks.length - failed} PASS / ${failed} FAIL`);
process.exitCode = failed ? 1 : 0;
