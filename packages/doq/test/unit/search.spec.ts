import { describe, expect, it } from 'vitest';
import { defineDoqConfig, provideDoq } from '../../src/lib/doq-config';
import {
  createLatestGate,
  excerptSegments,
  mapPagefindFragment,
  normalizeDoqSearchConfig,
  normalizeSearchResultUrl,
} from '../../src/lib/doq-search';

describe('UNIT-010 normalizeDoqSearchConfig', () => {
  it('is disabled with the default bundle path when omitted or empty', () => {
    expect(normalizeDoqSearchConfig(undefined)).toEqual({ enabled: false, bundlePath: '/pagefind/' });
    expect(normalizeDoqSearchConfig({})).toEqual({ enabled: false, bundlePath: '/pagefind/' });
    expect(normalizeDoqSearchConfig({ bundlePath: '/search' }).enabled).toBe(false);
  });

  it.each([
    [{ enabled: true }, { enabled: true, bundlePath: '/pagefind/' }],
    [{ enabled: true, bundlePath: '/assets/search' }, { enabled: true, bundlePath: '/assets/search/' }],
    [{ enabled: true, bundlePath: ' /x/ ' }, { enabled: true, bundlePath: '/x/' }],
    [{ enabled: true, bundlePath: 'https://cdn.example.com/search' }, { enabled: true, bundlePath: 'https://cdn.example.com/search/' }],
    [{ enabled: false, bundlePath: '/off/' }, { enabled: false, bundlePath: '/off/' }],
  ])('normalizes %j', (input, expected) => {
    expect(normalizeDoqSearchConfig(input)).toEqual(expected);
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['relative', 'pagefind/'],
    ['protocol-relative', '//evil.example/pagefind/'],
    ['traversal', '/a/../b/'],
    ['dot segment', '/./pagefind/'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['data scheme', 'data:text/javascript,1'],
    ['query string', '/pagefind/?x=1'],
    ['fragment', '/pagefind/#x'],
    ['inner whitespace', '/page find/'],
    ['backslash', '/a\\b/'],
  ])('rejects bundlePath: %s', (_label, bundlePath) => {
    expect(() => normalizeDoqSearchConfig({ enabled: true, bundlePath })).toThrow(/invalid search.bundlePath/);
  });

  it('rejects a non-boolean enabled flag and a non-object config', () => {
    expect(() => normalizeDoqSearchConfig({ enabled: 'yes' as unknown as boolean })).toThrow(/search.enabled/);
    expect(() => normalizeDoqSearchConfig('on' as never)).toThrow(/search must be an object/);
  });

  it('is applied by defineDoqConfig and provideDoq and absent for existing consumers', () => {
    expect(defineDoqConfig({ contentDirectory: 'docs' })).not.toHaveProperty('search');
    expect(defineDoqConfig({ contentDirectory: 'docs', search: { enabled: true } }).search).toEqual({ enabled: true, bundlePath: '/pagefind/' });
    expect(() => defineDoqConfig({ contentDirectory: 'docs', search: { bundlePath: '' } })).toThrow(/bundlePath/);
    const provider = provideDoq({ contentDirectory: 'docs' }) as { useValue: Record<string, unknown> };
    expect(provider.useValue['search']).toBeUndefined();
  });
});

describe('UNIT-011 normalizeSearchResultUrl', () => {
  it.each([
    ['/docs/overview/', '/docs', '/docs/overview'],
    ['/docs/overview/index.html', '/docs', '/docs/overview'],
    ['/docs/overview.html', '/docs', '/docs/overview'],
    ['/docs/onboarding/first-application/#create-a-workspace', '/docs', '/docs/onboarding/first-application#create-a-workspace'],
    ['https://example.com/docs/guides/routing/?q=1#add-a-document', '/docs', '/docs/guides/routing#add-a-document'],
    ['/handbook/a/b/', '/handbook', '/handbook/a/b'],
    ['/handbook', '/handbook', '/handbook'],
    ['/docs/x/', 'docs/', '/docs/x'],
    ['/learn/docs/x/', '/learn/docs', '/learn/docs/x'],
    ['/guides/routing/#add', '/', '/guides/routing#add'],
    ['/index.html', '/', '/'],
    ['https://example.com/', '/', '/'],
  ])('maps %s below %s to %s', (url, basePath, expected) => {
    expect(normalizeSearchResultUrl(url, basePath)).toBe(expected);
  });

  it.each([
    ['/', '/docs'],
    ['/blog/post/', '/docs'],
    ['/docsx/page/', '/docs'],
    ['/docs/../admin/', '/docs'],
    ['//evil.example/docs/x/', '/docs'],
    ['docs/relative/', '/docs'],
    ['', '/docs'],
    ['/docs/x/', '/handbook'],
  ])('drops %s outside %s', (url, basePath) => {
    expect(normalizeSearchResultUrl(url, basePath)).toBeUndefined();
  });
});

describe('UNIT-012 excerpt and result mapping', () => {
  it('keeps only mark boundaries and decodes entities into text', () => {
    expect(excerptSegments('Use <mark>label</mark> and &lt;input&gt; &amp; more')).toEqual([
      { text: 'Use ', mark: false },
      { text: 'label', mark: true },
      { text: ' and <input> & more', mark: false },
    ]);
  });

  it('strips every other tag so markup cannot reach the DOM as markup', () => {
    const segments = excerptSegments('<img src=x onerror=alert(1)><b>bold</b> <mark>hit</mark><script>alert(1)</script>');
    expect(segments.map((segment) => segment.text).join('')).toBe('bold hitalert(1)');
    expect(segments.every((segment) => !/[<>]/.test(segment.text))).toBe(true);
    expect(segments.filter((segment) => segment.mark).map((segment) => segment.text)).toEqual(['hit']);
  });

  it('returns no segments for an empty excerpt', () => {
    expect(excerptSegments('')).toEqual([]);
  });

  it('maps anchored sections to rows that link to the section on the canonical page', () => {
    const rows = mapPagefindFragment(
      {
        url: '/docs/onboarding/first-application/',
        excerpt: 'page excerpt',
        meta: { title: 'Getting started' },
        sub_results: [
          { title: 'Getting started', url: '/docs/onboarding/first-application/', excerpt: 'intro', anchor: null },
          { title: 'Create a workspace', url: '/docs/onboarding/first-application/#create-a-workspace', excerpt: 'Keep <mark>credentials</mark> out', anchor: { id: 'create-a-workspace' } },
        ],
      },
      '/docs',
    );
    expect(rows).toEqual([
      {
        url: '/docs/onboarding/first-application#create-a-workspace',
        title: 'Getting started',
        section: 'Create a workspace',
        excerpt: [
          { text: 'Keep ', mark: false },
          { text: 'credentials', mark: true },
          { text: ' out', mark: false },
        ],
      },
    ]);
  });

  it('falls back to the page excerpt and caps rows per page', () => {
    expect(mapPagefindFragment({ url: '/docs/a/', excerpt: 'plain', meta: { title: 'A' }, sub_results: [] }, '/docs')).toEqual([
      { url: '/docs/a', title: 'A', excerpt: [{ text: 'plain', mark: false }] },
    ]);
    const many = Array.from({ length: 5 }, (_, index) => ({ title: `S${index}`, url: `/docs/a/#s${index}`, excerpt: 'x', anchor: { id: `s${index}` } }));
    expect(mapPagefindFragment({ url: '/docs/a/', meta: { title: 'A' }, sub_results: many }, '/docs')).toHaveLength(2);
  });

  it('drops results outside the Doq base path and untitled pages use the last path segment', () => {
    expect(mapPagefindFragment({ url: '/blog/post/', meta: { title: 'Post' } }, '/docs')).toEqual([]);
    expect(mapPagefindFragment({ url: '/docs/guides/routing/' }, '/docs')[0]?.title).toBe('routing');
  });
});

describe('UNIT-013 createLatestGate', () => {
  it('only the newest ticket is current, so stale responses are ignored', async () => {
    const gate = createLatestGate();
    const published: string[] = [];
    const run = async (label: string, delay: number) => {
      const ticket = gate.next();
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (gate.isCurrent(ticket)) published.push(label);
    };
    await Promise.all([run('slow-old', 30), run('fast-new', 5)]);
    expect(published).toEqual(['fast-new']);
  });

  it('cancel invalidates in-flight work', () => {
    const gate = createLatestGate();
    const ticket = gate.next();
    gate.cancel();
    expect(gate.isCurrent(ticket)).toBe(false);
  });
});
