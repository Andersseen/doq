import { describe, expect, it } from 'vitest';
import { doqPrerenderRoutes, normalizeDoqPaths } from '../../config/src/lib/doq-paths';
import { defineDoqConfig, provideDoq } from '../../config/src/lib/doq-config';

describe('UNIT-001 normalizeDoqPaths', () => {
  it.each([
    [{ contentDirectory: 'docs' }, { contentDirectory: 'docs', basePath: '/docs' }],
    [{ contentDirectory: '/docs/' }, { contentDirectory: 'docs', basePath: '/docs' }],
    [{ contentDirectory: 'guides\\v1' }, { contentDirectory: 'guides/v1', basePath: '/docs' }],
    [{ contentDirectory: 'docs', basePath: 'learn' }, { contentDirectory: 'docs', basePath: '/learn' }],
    [{ contentDirectory: 'docs', basePath: '//a///b/' }, { contentDirectory: 'docs', basePath: '/a/b' }],
    [{ contentDirectory: 'docs', basePath: '/' }, { contentDirectory: 'docs', basePath: '/' }],
    [{ contentDirectory: 'docs', basePath: '///' }, { contentDirectory: 'docs', basePath: '/' }],
  ])('normalizes %j', (input, expected) => {
    expect(normalizeDoqPaths(input)).toEqual(expected);
  });

  it.each([
    ['empty', ''],
    ['only slashes', '///'],
    ['parent traversal', '../secrets'],
    ['nested traversal', 'docs/../../etc'],
    ['dot segment', 'docs/./x'],
    ['windows traversal', 'docs\\..\\x'],
  ])('rejects contentDirectory: %s', (_label, contentDirectory) => {
    expect(() => normalizeDoqPaths({ contentDirectory })).toThrow(/invalid contentDirectory/);
  });

  it.each([[''], ['/..'], ['/docs/../admin'], ['/./docs']])('rejects basePath %j', (basePath) => {
    expect(() => normalizeDoqPaths({ contentDirectory: 'docs', basePath })).toThrow(/invalid basePath/);
  });
});

describe('UNIT-002 doqPrerenderRoutes', () => {
  it('emits the index route and a recursive content directory expansion', () => {
    const [index, content] = doqPrerenderRoutes({ contentDirectory: 'docs', basePath: '/learn' });
    expect(index).toBe('/learn');
    expect(content).toMatchObject({ contentDir: 'src/content/docs', recursive: true });
  });

  it('maps content files to canonical and custom-slug URLs through the shared base path', () => {
    const content = doqPrerenderRoutes({ contentDirectory: 'docs', basePath: '/learn' })[1];
    if (typeof content === 'string') throw new Error('expected a content route');
    expect(content.transform({ name: 'install', relativePath: 'guides' })).toBe('/learn/guides/install');
    expect(content.transform({ name: 'x', relativePath: 'guides', attributes: { slug: 'start-here' } })).toBe('/learn/start-here');
  });

  it('rejects invalid paths before producing any route', () => {
    expect(() => doqPrerenderRoutes({ contentDirectory: '../x' })).toThrow();
  });
});

describe('UNIT-003 configuration defaults', () => {
  it('defineDoqConfig returns normalized paths and keeps other options', () => {
    expect(defineDoqConfig({ contentDirectory: '/docs/', sidebar: 'right' })).toMatchObject({
      contentDirectory: 'docs',
      basePath: '/docs',
      sidebar: 'right',
    });
  });

  it('defineDoqConfig rejects invalid paths', () => {
    expect(() => defineDoqConfig({ contentDirectory: '' })).toThrow(/invalid contentDirectory/);
  });

  it('provideDoq applies documented layout defaults and lets explicit values win', () => {
    const defaults = provideDoq({ contentDirectory: 'docs' }) as { useValue: Record<string, unknown> };
    expect(defaults.useValue).toMatchObject({
      contentWidth: '46rem',
      showTableOfContents: true,
      sidebar: 'left',
      sidebarWidth: '16rem',
      basePath: '/docs',
    });
    const custom = provideDoq({ contentDirectory: 'docs', showTableOfContents: false, sidebar: 'hidden' }) as {
      useValue: Record<string, unknown>;
    };
    expect(custom.useValue).toMatchObject({ showTableOfContents: false, sidebar: 'hidden' });
  });
});

describe('UNIT-051 documentation mounted at the application root', () => {
  it('prerenders the root index and root-level document routes without a double slash', () => {
    const [index, content] = doqPrerenderRoutes({ contentDirectory: 'docs', basePath: '/' });
    expect(index).toBe('/');
    if (typeof content === 'string') throw new Error('expected a content route');
    expect(content.transform({ name: 'getting-started' })).toBe('/getting-started');
    expect(content.transform({ name: 'index', relativePath: 'guides' })).toBe('/guides');
    expect(content.transform({ name: 'a', attributes: { slug: '/ui/button/' } })).toBe('/ui/button');
  });
});
