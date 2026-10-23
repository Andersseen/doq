import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildContent, checkContent, DoqContentError, generateContent } from '../../bin/content.mjs';
import { extractSnippet, scanRegions } from '../../bin/content/regions.mjs';
import { fenceFor, fenceTracker, parseAttributes, splitFrontmatter } from '../../bin/content/markdown.mjs';

let cwd: string;
const cli = resolve(import.meta.dirname, '../../bin/doq.mjs');

beforeEach(async () => {
  cwd = await realpath(await mkdtemp(join(tmpdir(), 'doq-content-')));
  await mkdir(join(cwd, 'lib'));
  await mkdir(join(cwd, 'authoring'));
});
afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

async function write(files: Record<string, string>) {
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(cwd, path)), { recursive: true });
    await writeFile(join(cwd, path), text);
  }
}
const read = (path: string) => readFile(join(cwd, path), 'utf8');
const target = (extra: Record<string, unknown> = {}) => ({ authoring: 'authoring', out: 'content', sourceRoots: ['lib'], ...extra });
const options = (extra: Record<string, unknown> = {}) => ({ cwd, targets: [target(extra)] });
const page = (body: string) => `---\ntitle: Page\n---\n${body}\n`;
async function problems(files: Record<string, string>, extra: Record<string, unknown> = {}) {
  await write(files);
  const built = await buildContent(options(extra));
  return built.diagnostics;
}
async function resolved(body: string, files: Record<string, string> = {}, extra: Record<string, unknown> = {}) {
  await write({ 'authoring/page.md': page(body), ...files });
  const built = await buildContent(options(extra));
  expect(built.diagnostics).toEqual([]);
  return built.results[0]!.files.get('page.md')!;
}

const SOURCE = `import { x } from 'y';

// #region doqs:basic
export function provide() {
  // #region doqs:inner
  return { reducedMotion: 'system' };
  // #endregion doqs:inner
}
// #endregion doqs:basic

export const tail = 1;
`;

describe('UNIT-160 region extraction', () => {
  it('extracts a named region without markers, keeps nesting and indentation, and reports 1-based lines', () => {
    const result = extractSnippet(SOURCE.trimEnd(), { region: 'basic' });
    expect(result).toMatchObject({ ok: true, snippet: { start: 4, end: 8 } });
    if (result.ok) expect(result.snippet.lines).toEqual(['export function provide() {', "  return { reducedMotion: 'system' };", '}']);
    const inner = extractSnippet(SOURCE.trimEnd(), { region: 'inner' });
    if (inner.ok) expect(inner.snippet.lines).toEqual(["return { reducedMotion: 'system' };"]);
  });
  it('supports whole files, line ranges and comment styles of HTML, CSS and shell', () => {
    const whole = extractSnippet('a\n// #region doqs:r\nb\n// #endregion doqs:r\nc', {});
    if (whole.ok) expect(whole.snippet.lines).toEqual(['a', 'b', 'c']);
    const lines = extractSnippet('1\n2\n3\n4', { lines: { from: 2, to: 3 } });
    if (lines.ok) expect(lines.snippet).toMatchObject({ lines: ['2', '3'], start: 2, end: 3 });
    for (const [open, close] of [['<!-- #region doqs:x -->', '<!-- #endregion doqs:x -->'], ['/* #region doqs:x */', '/* #endregion doqs:x */'], ['# #region doqs:x', '# #endregion doqs:x']]) {
      const got = extractSnippet(`${open}\nbody\n${close}`, { region: 'x' });
      expect(got.ok && got.snippet.lines).toEqual(['body']);
    }
  });
  it('rejects missing, duplicate, unterminated, misnested and empty regions and bad ranges', () => {
    expect(extractSnippet(SOURCE, { region: 'nope' })).toMatchObject({ ok: false, reason: 'region-missing', available: ['basic', 'inner'] });
    expect(extractSnippet('// #region doqs:a\n// #endregion doqs:a\n// #region doqs:a\n// #endregion doqs:a', { region: 'a' })).toMatchObject({ ok: false, reason: 'invalid', message: expect.stringContaining('more than once') });
    expect(extractSnippet('// #region doqs:a\nx', { region: 'a' })).toMatchObject({ ok: false, message: expect.stringContaining('never closed') });
    expect(extractSnippet('// #region doqs:a\n// #region doqs:b\n// #endregion doqs:a\n// #endregion doqs:b', { region: 'a' })).toMatchObject({ ok: false, message: expect.stringContaining('wrong region') });
    expect(extractSnippet('// #endregion doqs:a', {})).toMatchObject({ ok: false, message: expect.stringContaining('no matching') });
    expect(extractSnippet('// #region doqs:a\n\n  \n// #endregion doqs:a', { region: 'a' })).toMatchObject({ ok: false, reason: 'empty' });
    expect(extractSnippet('a\nb', { lines: { from: 2, to: 9 } })).toMatchObject({ ok: false, reason: 'range' });
    expect(scanRegions(['// #region other', 'x']).regions.size).toBe(0); // editor folding markers without "doqs:" are ordinary code
  });
  it('normalises nothing it was not given: mixed indentation is kept relative and blank lines stay empty', () => {
    const got = extractSnippet('// #region doqs:r\n\tif (a) {\n\n\t\tb();\n\t}\n// #endregion doqs:r', { region: 'r' });
    expect(got.ok && got.snippet.lines).toEqual(['if (a) {', '', '\tb();', '}']);
  });
});

describe('UNIT-161 markdown scanning primitives', () => {
  it('parses attributes strictly', () => {
    expect(parseAttributes('file="a b.ts" region="x"')).toEqual({ ok: true, attributes: new Map([['file', 'a b.ts'], ['region', 'x']]) });
    expect(parseAttributes('file="a\\"b"')).toMatchObject({ ok: true, attributes: new Map([['file', 'a"b']]) });
    for (const bad of ['file=a', 'file', 'file="a', 'file="a" file="b"', 'file="a"region="b"', '="x"']) expect(parseAttributes(bad).ok).toBe(false);
  });
  it('tracks backtick and tilde fences, ignoring look-alikes', () => {
    const fence = fenceTracker();
    expect(['a', '```ts', '::source{file="x"}', '```', 'b', '~~~~', '```', '~~~~', 'c'].map((line) => fence.next(line))).toEqual([false, true, true, true, false, true, true, true, false]);
  });
  it('splits frontmatter and picks a fence longer than any backtick run', () => {
    expect(splitFrontmatter('---\ntitle: A\n---\nbody\n')).toMatchObject({ body: 'body\n', bodyLine: 4 });
    expect(splitFrontmatter('no frontmatter').frontmatter).toBeUndefined();
    expect(fenceFor('plain')).toBe('```');
    expect(fenceFor('a ````` b')).toBe('``````');
  });
});

describe('UNIT-162 source directive', () => {
  it('renders a region as a highlighted fenced block with an inferred language and optional title', async () => {
    const out = await resolved('Intro\n\n::source{file="lib/movement.ts" region="basic" title="movement.ts"}\n\nOutro', { 'lib/movement.ts': SOURCE });
    expect(out).toContain('Intro\n\n:::code movement.ts\n\n```ts\nexport function provide() {');
    expect(out).toContain("  return { reducedMotion: 'system' };\n}\n```\n\nOutro");
    expect(out).not.toContain('#region');
    expect(out).toContain('# Generated by doq content from authoring/page.md.');
  });
  it('supports whole files, ranges, an explicit language and each supported extension', async () => {
    const out = await resolved('::source{file="lib/a.scss"}\n\n::source{file="lib/b.sh" lines="2" lang="sh"}\n\n::source{file="lib/c.json" lines="1-2"}', {
      'lib/a.scss': '.a { color: red; }\n', 'lib/b.sh': '#!/bin/sh\necho hi\n', 'lib/c.json': '{\n  "a": 1\n}\n',
    });
    expect(out).toContain('```scss\n.a { color: red; }\n```');
    expect(out).toContain('```sh\necho hi\n```');
    expect(out).toContain('```json\n{\n  "a": 1\n```');
  });
  it('keeps Markdown, fences, directives and HTML inside a snippet literal', async () => {
    const hostile = 'const t = `\n```\n::playground[x]\n::demo[y]\n[[api:Nope]]\n:::tabs\n<script>alert(1)</script>\n`;\n';
    const out = await resolved('::source{file="lib/h.ts"}', { 'lib/h.ts': hostile });
    expect(out).toContain('````ts\n');
    expect(out).toContain('\n````\n');
    expect(out.match(/````/g)).toHaveLength(2);
    expect((await buildContent(options())).diagnostics).toEqual([]);
  });
  it('normalises line endings and a BOM', async () => {
    const out = await resolved('::source{file="lib/crlf.ts"}', { 'lib/crlf.ts': '﻿const a = 1;\r\nconst b = 2;\r\n' });
    expect(out).not.toContain('\r');
    expect(out).toContain('```ts\nconst a = 1;\nconst b = 2;\n```');
  });
  it('leaves directives literal in fences, inline code, quotes and mid-paragraph text', async () => {
    const body = '```md\n::source{file="missing.ts"}\n[[api:Nope]]\n```\n\n`::source{file="x"}` and `[[api:Nope]]`\n\n> ::source{file="x.ts"}\n\ntext ::include{file="x"} text';
    expect(await resolved(body)).toContain(body);
  });
  it('links to the configured revision and omits the link when nothing is configured', async () => {
    const files = { 'lib/movement.ts': SOURCE };
    const without = await resolved('::source{file="lib/movement.ts" region="basic"}', files);
    expect(without).not.toContain('View source');
    const linked = await resolved('::source{file="lib/movement.ts" region="basic"}\n\n::source{file="lib/movement.ts" region="basic" link="false"}', files, {
      sourceUrl: 'https://git.example/o/r/blob/{revision}/{path}{lines}', revision: 'v1.3.0', sourcePathPrefix: 'packages/m/',
    });
    expect(linked).toContain('[View source](https://git.example/o/r/blob/v1.3.0/packages/m/lib/movement.ts#L4-L8)');
    expect(linked.match(/View source/g)).toHaveLength(1);
  });
  it('rejects a {revision} template without a revision and non-http templates', async () => {
    await expect(buildContent(options({ sourceUrl: 'https://h/{revision}/{path}' }))).rejects.toThrow(/no "revision"/);
    await expect(buildContent(options({ sourceUrl: 'javascript:{path}' }))).rejects.toThrow(/http\(s\)/);
  });
});

describe('UNIT-163 source diagnostics', () => {
  it('reports missing files, regions, bad attributes and malformed directives with page, line and a fix', async () => {
    const found = await problems({
      'authoring/page.md': page('intro\n\n::source{file="lib/none.ts"}\n::source{file="lib/movement.ts" region="usage"}\n::source{file="lib/movement.ts" region="a" lines="1"}\n::source{region="x"}\n::source{file="lib/movement.ts" nope="1"}\n::source{file=lib/movement.ts}\n::source'),
      'lib/movement.ts': SOURCE,
    });
    expect(found.map((d) => [d.line, d.kind])).toEqual([[6, 'missing-source'], [7, 'missing-source'], [8, 'invalid-authoring'], [9, 'invalid-authoring'], [10, 'invalid-authoring'], [11, 'invalid-authoring'], [12, 'invalid-authoring']]);
    expect(found[1]).toMatchObject({ file: 'authoring/page.md', directive: '::source', message: expect.stringContaining('"usage" was not found'), hint: expect.stringContaining('Available regions: basic, inner') });
    expect(found[0]?.message).toContain('does not exist');
  });
  it('rejects invalid region markers in the source file and empty regions', async () => {
    const found = await problems({
      'authoring/page.md': page('::source{file="lib/dup.ts" region="a"}\n::source{file="lib/open.ts" region="a"}\n::source{file="lib/empty.ts" region="e"}'),
      'lib/dup.ts': '// #region doqs:a\n// #endregion doqs:a\n// #region doqs:a\n// #endregion doqs:a\n',
      'lib/open.ts': '// #region doqs:a\nx\n',
      'lib/empty.ts': '// #region doqs:e\n\n// #endregion doqs:e\n',
    });
    expect(found.map((d) => d.message.replace(/ \(line.*/, ''))).toEqual([
      expect.stringContaining('more than once'), expect.stringContaining('never closed'), expect.stringContaining('is empty'),
    ]);
  });
});

describe('UNIT-164 source path security', () => {
  it('refuses traversal, absolute paths, URLs, secrets, binaries, directories, big files and unknown types', async () => {
    await write({
      'outside/secret.ts': 'export const k = 1;', '.env': 'KEY=1', 'lib/.env.local': 'KEY=1', 'lib/aws.credentials.ts': 'x', 'lib/server.pem': 'x',
      'lib/node_modules/pkg/index.ts': 'x', 'lib/bin.ts': 'a\0b', 'lib/big.ts': 'a'.repeat(300_000), 'lib/dir.ts/inner.ts': 'x', 'lib/logo.png': 'x', 'lib/ok.ts': 'export const ok = 1;',
    });
    const refs = ['../outside/secret.ts', 'lib/../../outside/secret.ts', `${join(cwd, 'outside/secret.ts')}`, 'https://example.com/a.ts', 'file:///etc/passwd', '//host/a.ts',
      '.env', 'lib/.env.local', 'lib/aws.credentials.ts', 'lib/server.pem', 'lib/node_modules/pkg/index.ts', 'lib/bin.ts', 'lib/big.ts', 'lib/dir.ts', 'lib/logo.png', 'lib/none/../ok.ts'];
    await write({ 'authoring/page.md': page(refs.map((file) => `::source{file="${file}"}`).join('\n')) });
    const found = (await buildContent(options())).diagnostics;
    expect(found.map((d) => `${d.reference}:${d.kind}`)).toEqual(refs.slice(0, -1).map((ref) => `${ref}:unsafe-path`));
    expect(JSON.stringify(found)).not.toContain('KEY=1');
  });
  it('refuses symbolic links that leave the source roots and accepts ones that stay inside', async () => {
    await write({ 'outside/secret.ts': 'export const secret = 1;', 'lib/real.ts': 'export const real = 1;', 'authoring/page.md': page('::source{file="lib/escape.ts"}\n::source{file="lib/dirlink/secret.ts"}\n::source{file="lib/inside.ts"}') });
    await symlink(join(cwd, 'outside/secret.ts'), join(cwd, 'lib/escape.ts'));
    await symlink(join(cwd, 'outside'), join(cwd, 'lib/dirlink'));
    await symlink(join(cwd, 'lib/real.ts'), join(cwd, 'lib/inside.ts'));
    const found = (await buildContent(options())).diagnostics;
    expect(found.map((d) => [d.reference, d.kind])).toEqual([['lib/escape.ts', 'unsafe-path'], ['lib/dirlink/secret.ts', 'unsafe-path']]);
    expect(found[0]?.message).toContain('symbolic link');
  });
  it('refuses a symbolic-link source root and a missing or project-wide root', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'doq-outside-'));
    await symlink(outside, join(cwd, 'linked'));
    await expect(buildContent(options({ sourceRoots: ['linked'] }))).rejects.toThrow(/resolves outside the project/);
    await rm(outside, { recursive: true });
    await expect(buildContent(options({ sourceRoots: ['absent'] }))).rejects.toThrow(/does not exist/);
    await expect(buildContent(options({ sourceRoots: ['.'] }))).rejects.toThrow(/not the project itself/);
    await expect(buildContent(options({ sourceRoots: [join(cwd, 'outside')] }))).rejects.toThrow(/relative directory/);
  });
  it('shows a source file only below the configured roots and says so when none are configured', async () => {
    await write({ 'other/x.ts': 'export const x = 1;', 'authoring/page.md': page('::source{file="other/x.ts"}') });
    expect((await buildContent(options())).diagnostics[0]).toMatchObject({ kind: 'unsafe-path', message: expect.stringContaining('outside the configured source roots') });
    await mkdir(join(cwd, 'lib'), { recursive: true });
    expect((await buildContent(options({ sourceRoots: [] }))).diagnostics[0]?.message).toContain('none are configured');
  });
  it('never modifies a source file', async () => {
    await resolved('::source{file="lib/movement.ts" region="basic"}', { 'lib/movement.ts': SOURCE });
    expect(await read('lib/movement.ts')).toBe(SOURCE);
  });
});

describe('UNIT-165 includes', () => {
  it('includes fragments from the authoring root or relative to the including file, preserving headings', async () => {
    const out = await resolved('# Title\n\n::include{file="/_partials/pre.md"}\n\nAfter\n\n::include{file="_local.md"}', {
      'authoring/_partials/pre.md': '## Prerequisites\n\nInstall **Node**.\n', 'authoring/_local.md': 'Local fragment\n',
    });
    expect(out).toContain('# Title\n\n## Prerequisites\n\nInstall **Node**.\n\nAfter\n\nLocal fragment\n');
  });
  it('resolves nested includes relative to the parent fragment and applies every directive inside it', async () => {
    const out = await resolved('::include{file="/_a/outer.md"}', {
      'authoring/_a/outer.md': 'Outer\n::include{file="inner/leaf.md"}\n', 'authoring/_a/inner/leaf.md': '::source{file="lib/movement.ts" region="inner"}\n',
      'lib/movement.ts': SOURCE,
    });
    expect(out).toContain('Outer\n\n```ts\nreturn { reducedMotion');
  });
  it('detects cycles, depth, missing fragments, pages, frontmatter and escapes', async () => {
    const found = await problems({
      'authoring/page.md': page('::include{file="/_a.md"}\n::include{file="/_missing.md"}\n::include{file="/other.md"}\n::include{file="/_front.md"}\n::include{file="/../outside.md"}\n::include{file="/_d1.md"}\n::include{file="/_file.txt"}'),
      'authoring/_a.md': '::include{file="_b.md"}', 'authoring/_b.md': '::include{file="_a.md"}',
      'authoring/other.md': 'x', 'authoring/_front.md': '---\ntitle: x\n---\nbody', 'outside.md': 'x',
      'authoring/_d1.md': '::include{file="_d2.md"}', 'authoring/_d2.md': '::include{file="_d3.md"}', 'authoring/_d3.md': '::include{file="_d4.md"}',
      'authoring/_d4.md': '::include{file="_d5.md"}', 'authoring/_d5.md': '::include{file="_d6.md"}', 'authoring/_d6.md': 'end', 'authoring/_file.txt': 'x',
    });
    const text = found.map((d) => d.message).join('\n');
    expect(text).toContain('include cycle: _a.md -> _b.md -> _a.md');
    expect(text).toContain('does not exist');
    expect(text).toContain('is a page, not a fragment');
    expect(text).toContain('starts with frontmatter');
    expect(text).toContain('outside the authoring directory');
    expect(text).toContain('nested deeper than 5');
    expect(text).toContain('unsupported type');
    expect(found.find((d) => d.message.includes('cycle'))?.file).toBe('authoring/_b.md');
  });
  it('does not emit fragments as pages, ignores dotfiles and reports symbolic links', async () => {
    await write({ 'authoring/page.md': page('x'), 'authoring/_f.md': 'f', 'authoring/_dir/g.md': 'g', 'authoring/.hidden.md': 'h', 'authoring/sub/deep.md': page('d') });
    await symlink(join(cwd, 'authoring/_f.md'), join(cwd, 'authoring/linked.md'));
    const built = await buildContent(options());
    expect([...built.results[0]!.files.keys()]).toEqual(['page.md', 'sub/deep.md']);
    expect(built.diagnostics).toMatchObject([{ kind: 'unsafe-path', reference: 'linked.md' }]);
  });
  it('keeps ::demo and ::playground directives from fragments and from tab bodies for the Doqs renderer', async () => {
    const out = await resolved(':::tabs\n\n:::tab One\n\n::include{file="/_demo.md"}\n\n:::\n\n:::', { 'authoring/_demo.md': '::playground[button]\n\n::demo[card]\n' });
    expect(out).toContain('::playground[button]\n\n::demo[card]');
  });
});

describe('UNIT-166 API links', () => {
  const index = (symbols: Record<string, string>) => JSON.stringify({ generator: 'doq-api', files: {}, symbols });
  const api = { 'api/.doq-api.json': index({ MoveEnterDirective: '/docs/reference/generated/move-enter-directive', provideMovement: '/docs/reference/generated/provide-movement' }) };

  it('turns a symbol into an ordinary link with the route the generator recorded', async () => {
    const out = await resolved('See [[api:MoveEnterDirective]] and [[api:provideMovement|the provider]], `[[api:Literal]]`.', api, { api: ['api'] });
    expect(out).toContain('See [`MoveEnterDirective`](/docs/reference/generated/move-enter-directive) and [the provider](/docs/reference/generated/provide-movement), `[[api:Literal]]`.');
  });
  it('escapes labels and is not fooled by Markdown or HTML in them', async () => {
    const out = await resolved('[[api:provideMovement|<img src=x onerror=1> *x* ]]', api, { api: ['api'] });
    expect(out).toContain('[\\<img src=x onerror=1\\> \\*x\\*](/docs/reference/generated/provide-movement)');
  });
  it('reports unknown, case-mismatched, ambiguous and malformed links without inventing a URL', async () => {
    await write({ 'api2/.doq-api.json': index({ provideMovement: '/other/provide-movement' }), ...api });
    const found = await problems({ 'authoring/page.md': page('[[api:Nope]] [[api:movedirective]] [[api:provideMovement]] [[api:bad name]] [[api:X@v9]]') }, { api: ['api', 'api2'] });
    expect(found.map((d) => d.kind)).toEqual(['unknown-symbol', 'unknown-symbol', 'ambiguous-symbol', 'invalid-authoring', 'unknown-symbol']);
    expect(found[3]?.reference).toBe('bad name');
    expect(found[2]?.message).toContain('/docs/reference/generated/provide-movement, /other/provide-movement');
  });
  it('explains how to enable links when no index is configured', async () => {
    const found = await problems({ 'authoring/page.md': page('[[api:Anything]]') });
    expect(found[0]).toMatchObject({ kind: 'unknown-symbol', hint: expect.stringContaining('doq-api generate') });
    expect((await resolved('plain text')).includes('plain text')).toBe(true);
  });
  it('resolves against the active version by default and never falls back to the current index', async () => {
    await write({ 'v1/.doq-api.json': index({ OldOnly: '/docs/v/1/reference/old-only' }), ...api,
      'authoring/page.md': page('[[api:MoveEnterDirective]]\n[[api:OldOnly@v1]]'), 'authoring-v1/page.md': page('[[api:OldOnly]]\n[[api:MoveEnterDirective]]\n[[api:MoveEnterDirective@current]]') });
    const built = await buildContent({ cwd, targets: [
      { name: 'current', authoring: 'authoring', out: 'content', api: ['api'] },
      { name: 'v1', authoring: 'authoring-v1', out: 'content-v1', api: ['v1'] },
    ] });
    expect(built.diagnostics.map((d) => [d.file, d.reference])).toEqual([['authoring-v1/page.md', 'MoveEnterDirective']]);
    expect(built.results[0]!.files.get('page.md')).toContain('[`OldOnly`](/docs/v/1/reference/old-only)');
    expect(built.results[1]!.files.get('page.md')).toContain('[`MoveEnterDirective`](/docs/reference/generated/move-enter-directive)');
  });
  it('rejects an index without symbols, with unsafe routes or missing', async () => {
    await write({ 'old/.doq-api.json': JSON.stringify({ generator: 'doq-api', files: {} }), 'bad/.doq-api.json': index({ X: 'javascript:alert(1)' }), 'empty/readme.txt': 'x' });
    await expect(buildContent(options({ api: ['old'] }))).rejects.toThrow(/no symbol index/);
    await expect(buildContent(options({ api: ['bad'] }))).rejects.toThrow(/unsafe route/);
    await expect(buildContent(options({ api: ['empty'] }))).rejects.toThrow(/was not found/);
  });
});

describe('UNIT-167 generation, ownership and check', () => {
  const sources = { 'lib/movement.ts': SOURCE, 'authoring/page.md': page('::source{file="lib/movement.ts" region="basic"}'), 'authoring/nested/two.md': page('two') };

  it('writes owned pages, a manifest with hashes and no timestamps or absolute paths, deterministically', async () => {
    await write(sources);
    const first = await generateContent(options());
    expect(first.targets[0]).toMatchObject({ pageCount: 2, written: ['nested/two.md', 'page.md'] });
    const manifest = JSON.parse(await read('authoring/.doq-content.json'));
    expect(manifest.generator).toBe('doq content');
    expect(Object.keys(manifest.files)).toEqual(['nested/two.md', 'page.md']);
    expect(await read('authoring/.doq-content.json')).not.toContain(cwd);
    const before = await read('content/page.md');
    const again = await generateContent(options());
    expect(again.targets[0]).toMatchObject({ written: [], removed: [] });
    expect(await read('content/page.md')).toBe(before);
    expect(before).not.toContain(cwd);
  });
  it('check never writes and reports added, modified and removed output when authoring or source changes', async () => {
    await write(sources);
    expect((await checkContent(options())).targets[0]).toMatchObject({ upToDate: false, added: ['nested/two.md', 'page.md'] });
    await expect(read('content/page.md')).rejects.toThrow();
    await generateContent(options());
    expect((await checkContent(options())).upToDate).toBe(true);
    await write({ 'lib/movement.ts': SOURCE.replace("'system'", "'always'") });
    expect((await checkContent(options())).targets[0]).toMatchObject({ upToDate: false, modified: ['page.md'] });
    expect(await read('content/page.md')).toContain("'system'");
    await generateContent(options());
    expect(await read('content/page.md')).toContain("'always'");
    await rm(join(cwd, 'authoring/nested/two.md'));
    expect((await checkContent(options())).targets[0]).toMatchObject({ removed: ['nested/two.md'] });
    await generateContent(options());
    await expect(read('content/nested/two.md')).rejects.toThrow();
  });
  it('never overwrites hand-written pages or edited generated pages and changes nothing when blocked', async () => {
    await write({ ...sources, 'content/page.md': 'hand written\n', 'content/keep.md': 'mine\n' });
    await expect(generateContent(options())).rejects.toMatchObject({ kind: 'conflict', exitCode: 3, message: expect.stringContaining('page.md: already exists and was not generated') });
    await expect(read('content/nested/two.md')).rejects.toThrow();
    expect(await read('content/page.md')).toBe('hand written\n');
    await rm(join(cwd, 'content/page.md'));
    await generateContent(options());
    await write({ 'content/page.md': 'edited\n' });
    const checked = await checkContent(options());
    expect(checked.conflicts).toEqual(['page.md: was edited after it was generated']);
    await expect(generateContent(options())).rejects.toMatchObject({ kind: 'conflict' });
    expect(await read('content/page.md')).toBe('edited\n');
    expect(await read('content/keep.md')).toBe('mine\n');
  });
  it('writes nothing at all when any page is invalid', async () => {
    await write({ ...sources, 'authoring/bad.md': page('::source{file="lib/none.ts"}') });
    await expect(generateContent(options())).rejects.toMatchObject({ kind: 'invalid-authoring', exitCode: 4, message: expect.stringContaining('authoring/bad.md:4') });
    await expect(read('content/page.md')).rejects.toThrow();
  });
  it('refuses a corrupt or foreign manifest, a symlinked output and overlapping directories', async () => {
    await write({ ...sources, 'authoring/.doq-content.json': '{ nope' });
    await expect(generateContent(options())).rejects.toMatchObject({ kind: 'conflict', message: expect.stringContaining('not valid JSON') });
    await write({ 'authoring/.doq-content.json': JSON.stringify({ generator: 'doq content', files: { '../escape.md': 'x'.repeat(64) } }) });
    await expect(generateContent(options())).rejects.toMatchObject({ kind: 'conflict', message: expect.stringContaining('does not look like') });
    await rm(join(cwd, 'content'), { recursive: true, force: true });
    await mkdir(join(cwd, 'elsewhere'));
    await symlink(join(cwd, 'elsewhere'), join(cwd, 'content'));
    await expect(generateContent(options())).rejects.toThrow(/not a directory/); // an output directory is never a link
    await rm(join(cwd, 'content'));
    const outside = await mkdtemp(join(tmpdir(), 'doq-outside-'));
    await symlink(outside, join(cwd, 'content'));
    await expect(generateContent(options())).rejects.toThrow(/outside the project/);
    await rm(outside, { recursive: true });
    await expect(buildContent(options({ out: 'authoring/out' }))).rejects.toThrow(/separate directories/);
    await expect(buildContent(options({ out: '../x' }))).rejects.toThrow(/inside the project/);
    await expect(buildContent({ cwd, targets: [target({ name: 'one' }), target({ name: 'two' })] })).rejects.toThrow(/each target needs its own/);
  });
  it('mixes with manual pages: only owned files are removed and non-empty directories stay', async () => {
    await write({ ...sources, 'content/manual.md': 'manual\n' });
    await generateContent(options());
    await write({ 'content/nested/manual-sibling.md': 'mine\n' });
    await rm(join(cwd, 'authoring/nested/two.md'));
    await generateContent(options());
    expect(await read('content/nested/manual-sibling.md')).toBe('mine\n');
    expect(await read('content/manual.md')).toBe('manual\n');
  });
  it('rejects unknown configuration keys and a missing configuration file', async () => {
    await expect(buildContent({ cwd, targets: [{ ...target(), surprise: true }] })).rejects.toThrow(/unknown option "surprise"/);
    await expect(buildContent({ cwd })).rejects.toThrow(/doq\.content\.json was not found/);
    await write({ 'doq.content.json': '{' });
    await expect(buildContent({ cwd })).rejects.toThrow(/not valid JSON/);
  });
});

describe('UNIT-168 doq content command', () => {
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, 'content', ...args, '--dir', cwd], { encoding: 'utf8' });
  const config = JSON.stringify({ targets: [target()] });
  it('generates, checks and uses distinct exit codes', async () => {
    await write({ 'doq.content.json': config, 'lib/a.ts': 'export const a = 1;\n', 'authoring/p.md': page('::source{file="lib/a.ts"}') });
    const stale = run('check');
    expect(stale.status).toBe(1);
    expect(stale.stdout).toContain('stale');
    expect(run('generate').status).toBe(0);
    const ok = run('check', '--json');
    expect(ok.status).toBe(0);
    expect(JSON.parse(ok.stdout)).toMatchObject({ upToDate: true });
    await write({ 'authoring/p.md': page('::source{file="lib/none.ts"}') });
    const bad = run('generate');
    expect(bad.status).toBe(4);
    expect(bad.stderr).toContain('authoring/p.md:4');
    await write({ 'authoring/p.md': page('ok'), 'doq.content.json': '{}' });
    expect(run('check').status).toBe(2);
    expect(run('frobnicate').status).toBe(2);
  });
});

describe('UNIT-169 Vite plugin and watch workflow', () => {
  it('resolves on build start and re-resolves only for files it read or new authored pages, with the owner manifest ignored', async () => {
    const { EventEmitter } = await import('node:events');
    const { doqContent } = await import('../../bin/content.mjs');
    await write({ 'lib/a.ts': 'export const a = 1;\n', 'authoring/p.md': page('::source{file="lib/a.ts"}') });
    const plugin = doqContent(options());
    const watched: string[] = [];
    await plugin.buildStart.call({ addWatchFile: (file: string) => watched.push(file) });
    expect(await read('content/p.md')).toContain('export const a = 1;');
    expect(watched).toEqual(expect.arrayContaining([join(cwd, 'lib/a.ts'), join(cwd, 'authoring/p.md')]));

    const watcher = new EventEmitter();
    const errors: string[] = [];
    plugin.configureServer({ watcher, config: { logger: { error: (message: string) => errors.push(message) } } });
    const settle = () => new Promise((done) => setTimeout(done, 150));

    await write({ 'lib/a.ts': 'export const a = 2;\n' });
    watcher.emit('change', join(cwd, 'lib/a.ts'));
    await settle();
    expect(await read('content/p.md')).toContain('export const a = 2;');

    await write({ 'lib/unrelated.ts': 'export const u = 1;\n', 'authoring/new.md': page('new page') });
    watcher.emit('change', join(cwd, 'lib/unrelated.ts'));
    await settle();
    await expect(read('content/new.md')).rejects.toThrow();
    watcher.emit('add', join(cwd, 'authoring/new.md'));
    await settle();
    expect(await read('content/new.md')).toContain('new page');

    watcher.emit('change', join(cwd, 'authoring/.doq-content.json'));
    await write({ 'authoring/p.md': page('::source{file="lib/missing.ts"}') });
    watcher.emit('change', join(cwd, 'authoring/p.md'));
    await settle();
    expect(errors.join('\n')).toContain('lib/missing.ts');
    expect(await read('content/p.md')).toContain('export const a = 2;');
  });
});
