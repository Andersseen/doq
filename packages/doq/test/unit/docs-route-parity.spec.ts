import { describe, expect, it } from 'vitest';
import { expectedRoute } from '../../../../scripts/docs-check/lib.ts';
import { doqPrerenderRoute } from '../../src/lib/doq-document';

describe('UNIT-142 docs:check route expectations (SEO-03)', () => {
  it('maps content files to the same routes as the library prerender helper', () => {
    const cases: Array<[string, string, string | undefined, string]> = [
      ['/docs', 'installation.md', undefined, '/docs/installation'],
      ['/docs', 'guides/index.md', undefined, '/docs/guides'],
      ['/docs', 'ref/long-name.md', '/reference/api/', '/docs/reference/api'],
      ['/', 'intro.md', undefined, '/intro'],
      ['/docs/v/1', 'a/b.md', undefined, '/docs/v/1/a/b'],
    ];
    for (const [basePath, file, slug, route] of cases) {
      expect(expectedRoute(basePath, file, slug)).toBe(route);
      const name = file.split('/').pop()!.replace(/\.md$/, '');
      const relativePath = file.split('/').slice(0, -1).join('/') || undefined;
      expect(doqPrerenderRoute({ name, relativePath, attributes: slug ? { slug } : {} }, basePath)).toBe(route);
    }
  });
});
