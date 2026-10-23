import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { fixtureDocument } from './fixtures/docs.ts';
import { measureSite, referencedAssets } from './perf.ts';

const repo = resolve(import.meta.dirname, '..');

describe('UNIT-150 performance budgets (PERF-01, PERF-04)', () => {
  it('reads the first-loaded assets of a page: the entry module, its preloads and its stylesheets, not lazy chunks', () => {
    const html = `<head><link rel="stylesheet" href="/styles-A.css"><link rel="modulepreload" href="/assets/a.js"><link rel="icon" href="/favicon.ico"></head>
      <body><script type="module" crossorigin src="/assets/index-B.js"></script><script src="/legacy.js"></script><a href="/assets/lazy.js">x</a></body>`;
    expect(referencedAssets(html)).toEqual({
      scripts: ['/assets/a.js', '/assets/index-B.js'],
      styles: ['/styles-A.css'],
    });
  });

  it('measures gzip sizes, search index bytes, pages and files of a built site', async () => {
    const root = await mkdtemp(join(tmpdir(), 'doq-perf-'));
    const entry = 'export const answer = 42;\n'.repeat(200);
    await mkdir(join(root, 'assets'), { recursive: true });
    await mkdir(join(root, 'pagefind/index'), { recursive: true });
    await mkdir(join(root, 'docs/a'), { recursive: true });
    await writeFile(join(root, 'assets/index.js'), entry);
    await writeFile(join(root, 'assets/lazy.js'), 'export const lazy = 1;');
    await writeFile(join(root, 'styles.css'), 'a{color:red}'.repeat(50));
    await writeFile(join(root, 'pagefind/index/x.pf_index'), 'x'.repeat(1000));
    await writeFile(join(root, 'pagefind/pagefind.js'), 'runtime that is not part of the index');
    await writeFile(join(root, 'index.html'), '<html></html>');
    await writeFile(
      join(root, 'docs/a/index.html'),
      '<link rel="stylesheet" href="/styles.css"><script type="module" src="/assets/index.js"></script>',
    );
    const metrics = await measureSite(root, 'docs/a');
    expect(metrics.initialJsGzip).toBe(gzipSync(entry, { level: 9 }).length);
    expect(metrics.allJsGzip).toBeGreaterThan(metrics.initialJsGzip);
    expect(metrics.initialCssGzip).toBe(gzipSync('a{color:red}'.repeat(50), { level: 9 }).length);
    expect(metrics.searchIndexBytes).toBe(1000);
    expect(metrics).toMatchObject({ staticPages: 2, files: 7 });
  });

  it('keeps every budget honest: a baseline at or below its threshold, a reason, a known target and metric', async () => {
    const { budgets } = JSON.parse(await readFile(resolve(repo, 'perf-budgets.json'), 'utf8')) as {
      budgets: { target: string; metric: string; baseline: number; max: number; reason: string }[];
    };
    const known = new Set(['doq-core', 'showcase-a', 'showcase-b', 'scale']);
    const seen = new Set<string>();
    for (const budget of budgets) {
      expect(known.has(budget.target), budget.target).toBe(true);
      expect(budget.baseline, `${budget.target}/${budget.metric}`).toBeGreaterThan(0);
      expect(budget.max, `${budget.target}/${budget.metric}`).toBeGreaterThanOrEqual(budget.baseline);
      expect(budget.reason.length, `${budget.target}/${budget.metric} reason`).toBeGreaterThan(20);
      const key = `${budget.target}/${budget.metric}`;
      expect(seen.has(key), `duplicate ${key}`).toBe(false);
      seen.add(key);
    }
    // No budget may allow more than 10% over its baseline (page counts none): loosening needs a deliberate, reviewed edit.
    for (const budget of budgets)
      expect(budget.max / budget.baseline, `${budget.target}/${budget.metric}`).toBeLessThanOrEqual(
        budget.metric === 'staticPages' ? 1 : 1.35,
      );
  });
});

describe('UNIT-151 generated documentation fixtures (PERF-02)', () => {
  it('are a pure function of their index, so two generations are byte-identical', () => {
    expect(fixtureDocument(7, { demo: 'x', label: 'current' })).toEqual(
      fixtureDocument(7, { demo: 'x', label: 'current' }),
    );
    expect(fixtureDocument(7, {}).markdown).not.toBe(fixtureDocument(8, {}).markdown);
  });

  it('repeat headings and mix rich Markdown on every page, so duplicate suffixes are always exercised', () => {
    const { markdown, path } = fixtureDocument(12, { demo: 'vanta-button' });
    expect(path).toBe('stress/stress-0012.md');
    expect(markdown.match(/^## Usage$/gm)).toHaveLength(2);
    expect(markdown.match(/^### Details$/gm)).toHaveLength(2);
    expect(markdown).toContain('::demo[vanta-button]');
    expect(markdown).toContain(':::tabs');
    expect(markdown).toContain('> [!NOTE]');
  });
});
