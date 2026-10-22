import { describe, expect, it } from 'vitest';
import { normalizeDoqDocument, sortDoqDocuments, doqPrerenderRoute } from '../../src/lib/doq-document';

const file = (index: number, directory: string) => ({
  filename: `/project/src/content/${directory}/group-${Math.floor(index / 25)}/doc-${index}.md`,
  attributes: { title: `Doc ${index}`, order: index % 40 },
});

describe('UNIT-152 catalogs of a thousand documents (PERF-02)', () => {
  it('normalizes and orders 1,000 documents across versions deterministically, with unique routes per version', () => {
    const build = (directory: string, basePath: string) =>
      sortDoqDocuments(Array.from({ length: 1000 }, (_, index) => normalizeDoqDocument(file(index, directory), directory, basePath)!));
    const first = build('docs', '/docs');
    const second = build('docs', '/docs');
    const archive = build('docs-v1', '/docs/v/1');
    expect(first.map(document => document.routePath)).toEqual(second.map(document => document.routePath));
    expect(new Set(first.map(document => document.routePath)).size).toBe(1000);
    expect(first[0]!.routePath).toBe('/docs/group-0/doc-0');
    expect(archive[0]!.routePath).toBe('/docs/v/1/group-0/doc-0');
    // Ordering is by `order`, then route: stable no matter how the files arrive.
    const shuffled = [...first].reverse();
    expect(sortDoqDocuments(shuffled).map(document => document.routePath)).toEqual(first.map(document => document.routePath));
  });

  it('maps every generated file to the same prerender route the catalog serves', () => {
    for (let index = 0; index < 1000; index += 97) {
      const document = normalizeDoqDocument(file(index, 'docs'), 'docs', '/docs')!;
      const route = doqPrerenderRoute({ name: `doc-${index}`, relativePath: `group-${Math.floor(index / 25)}` }, '/docs');
      expect(route).toBe(document.routePath);
    }
  });
});
