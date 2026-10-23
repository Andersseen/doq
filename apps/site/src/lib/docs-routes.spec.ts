import '@angular/compiler'; // the partially compiled Doqs package needs the JIT facade outside a bundler
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { doqPaths } from '../doq.paths.ts';
import { docsRoutes } from './docs-routes.ts';

describe('UNIT-090 official documentation routes', () => {
  it('lists the index and every Markdown file by Doqs\'s own URL rule, honouring custom slugs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'doq-site-docs-'));
    try {
      await mkdir(join(root, 'docs/guides'), { recursive: true });
      await writeFile(join(root, 'docs/start.md'), '---\ntitle: Start\n---\n');
      await writeFile(join(root, 'docs/guides/index.md'), '---\ntitle: Guides\n---\n');
      await writeFile(join(root, 'docs/guides/setup.md'), '---\ntitle: Setup\nslug: how/to-setup\n---\n');
      expect(docsRoutes(doqPaths, root)).toEqual(['/docs', '/docs/guides', '/docs/how/to-setup', '/docs/start']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('matches the pages that exist in the site content', () => {
    const routes = docsRoutes(doqPaths, join(import.meta.dirname, '../content'));
    expect(routes).toContain('/docs');
    expect(routes).toContain('/docs/getting-started');
    expect(routes).toContain('/docs/guides/rich-markdown');
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes.length).toBeGreaterThanOrEqual(15);
  });
});
