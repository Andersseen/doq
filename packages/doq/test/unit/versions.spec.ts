import { describe, expect, it } from 'vitest';
import { doqPrerenderRoute } from '../../src/lib/doq-document';
import { defineDoqConfig } from '../../src/lib/doq-config';
import { doqPrerenderRoutes, normalizeDoqPaths } from '../../src/lib/doq-paths';
import { assertDoqSlugNotReserved, doqCanonicalUrl, doqVersionLinks, getDoqVersions, normalizeDoqVersioning } from '../../src/lib/doq-versions';

const versioning = { current: { id: 'latest', label: 'Latest' }, archives: [{ id: '1.3', label: 'v1.3', contentDirectory: 'docs-v1-3' }, { id: '1.2', contentDirectory: 'docs-v1-2' }] } as const;

describe('UNIT-110 version configuration (VER-01, VER-02, VER-09)', () => {
  it('leaves an unversioned configuration exactly as in 0.5', () => {
    expect(normalizeDoqPaths({ contentDirectory: 'docs' })).toEqual({ contentDirectory: 'docs', basePath: '/docs' });
    expect(Object.keys(normalizeDoqPaths({ contentDirectory: 'docs', basePath: '/' }))).toEqual(['contentDirectory', 'basePath']);
    expect(getDoqVersions(normalizeDoqPaths({ contentDirectory: 'docs' }))).toEqual([{ id: 'current', label: 'Current', contentDirectory: 'docs', basePath: '/docs', current: true }]);
  });

  it('resolves labels, default segment and configured order', () => {
    const resolved = normalizeDoqPaths({ contentDirectory: 'docs', versioning }).versioning!;
    expect(resolved.pathSegment).toBe('v');
    expect(resolved.current).toEqual({ id: 'latest', label: 'Latest' });
    expect(resolved.archives.map(a => [a.id, a.label, a.contentDirectory])).toEqual([['1.3', 'v1.3', 'docs-v1-3'], ['1.2', '1.2', 'docs-v1-2']]);
  });

  it('is idempotent, so defineDoqConfig() output can be normalized again', () => {
    const once = defineDoqConfig({ contentDirectory: 'docs', versioning });
    expect(normalizeDoqPaths(once)).toEqual({ contentDirectory: 'docs', basePath: '/docs', versioning: once.versioning });
  });

  it.each([
    ['missing current', { archives: [] }, /versioning\.current is required/],
    ['non-object', null, /versioning must be an object/],
    ['empty id', { current: { id: '' } }, /invalid version id/],
    ['id with slash', { current: { id: 'a/b' } }, /invalid version id/],
    ['id with space', { current: { id: 'a b' } }, /invalid version id/],
    ['id with traversal', { current: { id: 'x' }, archives: [{ id: '..', contentDirectory: 'a' }] }, /invalid version id/],
    ['duplicate archive ids', { current: { id: 'x' }, archives: [{ id: '1', contentDirectory: 'a' }, { id: '1', contentDirectory: 'b' }] }, /duplicate version id "1"/],
    ['archive equals current id', { current: { id: 'x' }, archives: [{ id: 'X', contentDirectory: 'a' }] }, /duplicate version id/],
    ['missing archive directory', { current: { id: 'x' }, archives: [{ id: '1' }] }, /needs a contentDirectory/],
    ['unsafe archive directory', { current: { id: 'x' }, archives: [{ id: '1', contentDirectory: '../x' }] }, /needs a contentDirectory/],
    ['archive shares current directory', { current: { id: 'x' }, archives: [{ id: '1', contentDirectory: 'docs' }] }, /overlaps "docs"/],
    ['archive nested in current', { current: { id: 'x' }, archives: [{ id: '1', contentDirectory: 'docs/v1' }] }, /overlaps "docs"/],
    ['archives overlap', { current: { id: 'x' }, archives: [{ id: '1', contentDirectory: 'a' }, { id: '2', contentDirectory: 'a/b' }] }, /overlaps "a"/],
    ['bad segment', { current: { id: 'x' }, pathSegment: 'a/b' }, /pathSegment/],
    ['bad origin', { current: { id: 'x' }, canonicalOrigin: 'docs.example.com' }, /canonicalOrigin/],
    ['origin with path', { current: { id: 'x' }, canonicalOrigin: 'https://a.com/docs' }, /canonicalOrigin/],
    ['empty label', { current: { id: 'x', label: ' ' } }, /empty label/],
  ])('rejects %s', (_name, input, message) => {
    expect(() => normalizeDoqVersioning(input as never, 'docs')).toThrow(message);
  });

  it('accepts a similarly named sibling directory (docs vs docs-v1)', () => {
    expect(() => normalizeDoqVersioning({ current: { id: 'x' }, archives: [{ id: '1', contentDirectory: 'docs-v1' }] }, 'docs')).not.toThrow();
  });
});

describe('UNIT-111 canonical URLs (VER-03, VER-04, VER-05)', () => {
  const embedded = getDoqVersions(normalizeDoqPaths({ contentDirectory: 'docs', versioning }));
  const rooted = getDoqVersions(normalizeDoqPaths({ contentDirectory: 'docs', basePath: '/', versioning }));

  it('keeps the current version at the configured basePath and mounts archives below the segment', () => {
    expect(embedded.map(v => v.basePath)).toEqual(['/docs', '/docs/v/1.3', '/docs/v/1.2']);
    expect(rooted.map(v => v.basePath)).toEqual(['/', '/v/1.3', '/v/1.2']);
  });

  it('honours a custom path segment and nested base path', () => {
    const versions = getDoqVersions(normalizeDoqPaths({ contentDirectory: 'docs', basePath: '/learn/api', versioning: { ...versioning, pathSegment: 'releases' } }));
    expect(versions.map(v => v.basePath)).toEqual(['/learn/api', '/learn/api/releases/1.3', '/learn/api/releases/1.2']);
  });

  it('builds absolute canonical URLs only when an origin is configured', () => {
    const withOrigin = normalizeDoqVersioning({ ...versioning, canonicalOrigin: 'https://docs.example.com/' }, 'docs');
    expect(doqCanonicalUrl(withOrigin, '/docs/v/1.3/install')).toBe('https://docs.example.com/docs/v/1.3/install');
    expect(doqCanonicalUrl(withOrigin, '/')).toBe('https://docs.example.com/');
    expect(doqCanonicalUrl(normalizeDoqVersioning(versioning, 'docs'), '/docs')).toBeUndefined();
    expect(doqCanonicalUrl(undefined, '/docs')).toBeUndefined();
  });
});

describe('UNIT-112 version switching and fallback (NAV-04, NAV-05)', () => {
  const versions = getDoqVersions(normalizeDoqPaths({ contentDirectory: 'docs', versioning }));
  const catalogs = { latest: [{ slug: 'install' }, { slug: 'new-guide' }, { slug: 'reference/move' }], '1.3': [{ slug: 'install' }, { slug: 'reference/move' }], '1.2': [{ slug: 'setup' }] };
  const hrefs = (slug: string | null, active = 'latest') => Object.fromEntries(doqVersionLinks(versions, active, slug, catalogs).map(l => [l.id, l.href]));

  it('keeps the public slug where the target version has it, otherwise opens that version index', () => {
    expect(hrefs('install')).toEqual({ latest: '/docs/install', '1.3': '/docs/v/1.3/install', '1.2': '/docs/v/1.2' });
    expect(hrefs('new-guide')).toEqual({ latest: '/docs/new-guide', '1.3': '/docs/v/1.3', '1.2': '/docs/v/1.2' });
  });

  it('never guesses a similar document and treats an index page as index-to-index', () => {
    expect(hrefs('reference/move-enter')).toEqual({ latest: '/docs', '1.3': '/docs/v/1.3', '1.2': '/docs/v/1.2' });
    expect(hrefs(null, '1.3')).toEqual({ latest: '/docs', '1.3': '/docs/v/1.3', '1.2': '/docs/v/1.2' });
  });

  it('marks the active and current versions and whether the document is shared', () => {
    const links = doqVersionLinks(versions, '1.3', 'setup', catalogs);
    expect(links.map(l => [l.id, l.active, l.current, l.sameDocument])).toEqual([['latest', false, true, false], ['1.3', true, false, false], ['1.2', false, false, true]]);
  });

  it('builds root-mounted destinations without double slashes', () => {
    const root = getDoqVersions(normalizeDoqPaths({ contentDirectory: 'docs', basePath: '/', versioning }));
    expect(doqVersionLinks(root, 'latest', 'install', catalogs).map(l => l.href)).toEqual(['/install', '/v/1.3/install', '/v/1.2']);
  });
});

describe('UNIT-113 prerender routes and reserved prefix (BUILD-01, VER-08, VER-09)', () => {
  it('returns the unversioned routes unchanged', () => {
    expect(doqPrerenderRoutes({ contentDirectory: 'docs' }).map(r => (typeof r === 'string' ? r : r.contentDir))).toEqual(['/docs', 'src/content/docs']);
  });

  it('adds an index and a content route for every archive, with archive-prefixed URLs', () => {
    const routes = doqPrerenderRoutes({ contentDirectory: 'docs', versioning });
    expect(routes.map(r => (typeof r === 'string' ? r : r.contentDir))).toEqual(['/docs', 'src/content/docs', '/docs/v/1.3', 'src/content/docs-v1-3', '/docs/v/1.2', 'src/content/docs-v1-2']);
    const archive = routes[3] as Exclude<(typeof routes)[number], string>;
    expect(archive.transform({ name: 'index', relativePath: 'guides' })).toBe('/docs/v/1.3/guides');
    expect(archive.transform({ name: 'ignored', attributes: { slug: 'custom/slug' } })).toBe('/docs/v/1.3/custom/slug');
  });

  it('maps root-mounted archive files without double slashes', () => {
    const routes = doqPrerenderRoutes({ contentDirectory: 'docs', basePath: '/', versioning });
    expect(routes[0]).toBe('/');
    expect(routes[2]).toBe('/v/1.3');
    expect((routes[1] as { transform: (f: { name: string }) => string }).transform({ name: 'install' })).toBe('/install');
  });

  it('rejects a current slug that would shadow the archive prefix, but allows it inside an archive', () => {
    const [, current, , archive] = doqPrerenderRoutes({ contentDirectory: 'docs', versioning }) as { transform: (f: { name: string; attributes?: { slug?: unknown } }) => string }[];
    expect(() => current!.transform({ name: 'x', attributes: { slug: 'v/1/fake' } })).toThrow(/reserved archive prefix/);
    expect(archive!.transform({ name: 'x', attributes: { slug: 'v/other' } })).toBe('/docs/v/1.3/v/other');
    expect(() => doqPrerenderRoute({ name: 'v' }, '/docs', 'v')).toThrow(/reserved/);
    expect(doqPrerenderRoute({ name: 'vision' }, '/docs', 'v')).toBe('/docs/vision');
  });

  it('assertDoqSlugNotReserved only fires for the exact first segment', () => {
    expect(() => assertDoqSlugNotReserved('v/1/x', 'v', 'a.md')).toThrow(/collides/);
    expect(() => assertDoqSlugNotReserved('versions/x', 'v', 'a.md')).not.toThrow();
    expect(() => assertDoqSlugNotReserved('v/1/x', undefined, 'a.md')).not.toThrow();
  });

  it('fails on invalid archive configuration instead of skipping it', () => {
    expect(() => doqPrerenderRoutes({ contentDirectory: 'docs', versioning: { current: { id: 'a' }, archives: [{ id: '1', contentDirectory: 'docs' }] } })).toThrow(/overlaps/);
  });
});

describe('UNIT-114 duplicate slugs across versions (VER-07, VER-08)', async () => {
  const { normalizeDoqDocument, sortDoqDocuments } = await import('../../src/lib/doq-document');
  const file = (dir: string, name: string, slug?: string) => ({ filename: `/p/src/content/${dir}/${name}.md`, attributes: slug ? { slug } : {} });

  it('allows the same slug and title in separate version catalogs', () => {
    const current = sortDoqDocuments([normalizeDoqDocument({ ...file('docs', 'install'), attributes: { title: 'Install' } }, 'docs', '/docs')!]);
    const archive = sortDoqDocuments([normalizeDoqDocument({ ...file('docs-v1', 'install'), attributes: { title: 'Install' } }, 'docs-v1', '/docs/v/1')!]);
    expect([current[0]!.routePath, archive[0]!.routePath]).toEqual(['/docs/install', '/docs/v/1/install']);
  });

  it('does not attribute a sibling directory\'s file to this version', () => {
    expect(normalizeDoqDocument(file('docs-v1', 'install'), 'docs', '/docs')).toBeNull();
  });

  it('still rejects duplicates inside one version', () => {
    const docs = [normalizeDoqDocument(file('docs-v1', 'a', 'same'), 'docs-v1', '/docs/v/1')!, normalizeDoqDocument(file('docs-v1', 'b', 'same'), 'docs-v1', '/docs/v/1')!];
    expect(() => sortDoqDocuments(docs)).toThrow(/duplicate public route "\/docs\/v\/1\/same"/);
  });
});
