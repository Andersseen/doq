import { describe, expect, it } from 'vitest';
import {
  DoqDocument,
  DoqDocumentAttributes,
  doqPrerenderRoute,
  normalizeDoqDocument,
  sortDoqDocuments,
} from '../../config/src/lib/doq-document';

const file = (filename: string, attributes: DoqDocumentAttributes = {}) => ({ filename, attributes });
const root = '/project/src/content/docs/';

describe('UNIT-004 normalizeDoqDocument', () => {
  it('derives the canonical route and defaults from the source path', () => {
    const doc = normalizeDoqDocument(file(`${root}guides/install.md`), 'docs', '/docs');
    expect(doc).toMatchObject({
      sourceSlug: 'guides/install',
      slug: 'guides/install',
      routePath: '/docs/guides/install',
      title: 'install',
      description: '',
      group: 'guides',
      order: 100,
    });
  });

  it('treats index.md as its directory', () => {
    expect(normalizeDoqDocument(file(`${root}guides/index.md`), 'docs', '/docs')?.routePath).toBe('/docs/guides');
  });

  it('uses frontmatter title, description, group and order', () => {
    const doc = normalizeDoqDocument(
      file(`${root}a.md`, { title: ' Hello ', description: ' D ', group: ' G ', order: 3 }),
      'docs',
      '/docs',
    );
    expect(doc).toMatchObject({ title: 'Hello', description: 'D', group: 'G', order: 3 });
  });

  it('nested custom slugs replace the source route and the source filename is not routable', () => {
    const doc = normalizeDoqDocument(file(`${root}guides/long-name.md`, { slug: '/getting/started/' }), 'docs', '/docs/');
    expect(doc?.routePath).toBe('/docs/getting/started');
    expect(doc?.sourceSlug).toBe('guides/long-name');
    expect(doc?.routePath).not.toContain('long-name');
  });

  it('honors a custom base path', () => {
    expect(normalizeDoqDocument(file(`${root}a.md`), 'docs', 'learn/here')?.routePath).toBe('/learn/here/a');
  });

  it('UNIT-051: a root base path gives root-level routes', () => {
    expect(normalizeDoqDocument(file(`${root}guides/routing.md`), 'docs', '/')?.routePath).toBe('/guides/routing');
    expect(normalizeDoqDocument(file(`${root}a.md`, { slug: 'x/y' }), 'docs', '/')?.routePath).toBe('/x/y');
  });

  it('accepts Unicode slugs', () => {
    expect(normalizeDoqDocument(file(`${root}a.md`, { slug: 'guía-rápida' }), 'docs', '/docs')?.routePath).toBe(
      '/docs/guía-rápida',
    );
  });

  it('normalizes Windows separators', () => {
    expect(normalizeDoqDocument(file('C:\\p\\src\\content\\docs\\a.md'.replace(/\\/g, '/')), 'docs', '/docs')?.slug).toBe('a');
    expect(normalizeDoqDocument(file('/p\\src\\content\\docs\\sub\\a.md'), 'docs', '/docs')?.slug).toBe('sub/a');
  });

  it.each([
    ['non-markdown file', `${root}a.txt`],
    ['file outside the content directory', '/project/src/content/other/a.md'],
    ['lookalike directory prefix', '/project/xsrc/content/docs/a.md'],
    ['traversal in source path', `${root}../a.md`],
    ['empty source slug', root.slice(0, -1) + '/.md'],
  ])('ignores %s', (_label, filename) => {
    expect(normalizeDoqDocument(file(filename), 'docs', '/docs')).toBeNull();
  });

  it.each([
    ['blank', '   '],
    ['empty', ''],
    ['non-string', 7 as unknown as string],
  ])('rejects an explicit %s slug', (_label, slug) => {
    expect(() => normalizeDoqDocument(file(`${root}a.md`, { slug }), 'docs', '/docs')).toThrow(/invalid empty slug/);
  });

  it.each(['a b', 'a//b', 'a/../b', 'a.b', 'a?x', 'a#x', '%2e%2e'])('rejects invalid slug %j', (slug) => {
    expect(() => normalizeDoqDocument(file(`${root}a.md`, { slug }), 'docs', '/docs')).toThrow(/invalid slug/);
  });

  it('falls back to the default order when order is not a finite number', () => {
    expect(normalizeDoqDocument(file(`${root}a.md`, { order: Number.NaN }), 'docs', '/docs')?.order).toBe(100);
  });
});

describe('UNIT-005 sortDoqDocuments', () => {
  const doc = (routePath: string, order: number, sourceFilename = `${routePath}.md`) =>
    ({ routePath, order, sourceFilename }) as DoqDocument;

  it('orders by order, then by route', () => {
    const sorted = sortDoqDocuments([doc('/docs/z', 1), doc('/docs/b', 2), doc('/docs/a', 2), doc('/docs/m', -5)]);
    expect(sorted.map((d) => d.routePath)).toEqual(['/docs/m', '/docs/z', '/docs/a', '/docs/b']);
  });

  it('does not mutate its input', () => {
    const input = [doc('/docs/b', 1), doc('/docs/a', 0)];
    sortDoqDocuments(input);
    expect(input.map((d) => d.routePath)).toEqual(['/docs/b', '/docs/a']);
  });

  it('names both sources when two documents claim the same public route', () => {
    expect(() => sortDoqDocuments([doc('/docs/x', 1, 'one.md'), doc('/docs/x', 2, 'two.md')])).toThrow(
      /duplicate public route "\/docs\/x" from one\.md and two\.md/,
    );
  });

  it('detects a custom slug colliding with another document canonical route', () => {
    const a = normalizeDoqDocument(file(`${root}a.md`), 'docs', '/docs')!;
    const b = normalizeDoqDocument(file(`${root}b.md`, { slug: 'a' }), 'docs', '/docs')!;
    expect(() => sortDoqDocuments([a, b])).toThrow(/duplicate public route/);
  });
});

describe('UNIT-006 doqPrerenderRoute', () => {
  it.each([
    [{ name: 'install', relativePath: 'guides' }, '/docs/guides/install'],
    [{ name: 'index', relativePath: 'guides' }, '/docs/guides'],
    [{ name: 'intro' }, '/docs/intro'],
    [{ name: 'x', attributes: { slug: '/custom/' } }, '/docs/custom'],
    [{ name: 'x', relativePath: 'deep/er', attributes: { slug: 'a/b' } }, '/docs/a/b'],
  ])('maps %j', (entry, expected) => {
    expect(doqPrerenderRoute(entry)).toBe(expected);
  });

  it('uses the supplied base path', () => {
    expect(doqPrerenderRoute({ name: 'a' }, 'learn')).toBe('/learn/a');
  });

  it.each([
    [{ name: 'x', attributes: { slug: '' } }],
    [{ name: 'x', attributes: { slug: '   ' } }],
    [{ name: 'x', attributes: { slug: 3 } }],
  ])('rejects empty custom slug %j', (entry) => {
    expect(() => doqPrerenderRoute(entry)).toThrow(/invalid empty slug/);
  });

  it.each([
    [{ name: 'a b' }],
    [{ name: '..', relativePath: 'x' }],
    [{ name: 'a', relativePath: '../b' }],
    [{ name: 'x', attributes: { slug: 'a/../b' } }],
    [{ name: 'x', attributes: { slug: '/' } }],
  ])('rejects invalid slug %j', (entry) => {
    expect(() => doqPrerenderRoute(entry)).toThrow(/invalid prerender slug/);
  });

  it('agrees with normalizeDoqDocument for the same source', () => {
    const doc = normalizeDoqDocument(file(`${root}guides/install.md`, { slug: 'x/y' }), 'docs', '/docs');
    expect(doqPrerenderRoute({ name: 'install', relativePath: 'guides', attributes: { slug: 'x/y' } })).toBe(doc?.routePath);
  });
});
