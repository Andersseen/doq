// Node-only (imported by vite.config.ts and tests): the public URLs of the official documentation, derived from the
// Markdown files with Doqs's own rule so the sitemap lists exactly what the prerenderer generates.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { doqPrerenderRoute } from '@doqs/analog';
import type { DoqPaths } from '@doqs/analog';

function markdownFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .flatMap((entry) => (entry.isDirectory() ? markdownFiles(join(dir, entry.name)) : entry.name.endsWith('.md') ? [join(dir, entry.name)] : []));
}

/** Index route plus one route per Markdown file below `contentRoot`, sorted. */
export function docsRoutes(paths: DoqPaths, contentRoot: string): string[] {
  const root = join(contentRoot, paths.contentDirectory);
  const routes = markdownFiles(root).map((file) => {
    const parts = relative(root, file).split(sep);
    const name = parts.pop()!.replace(/\.md$/, '');
    const slug = /^slug:\s*['"]?([^'"\n]+?)['"]?\s*$/m.exec(/^---\n([\s\S]*?)\n---/.exec(readFileSync(file, 'utf8'))?.[1] ?? '')?.[1];
    return doqPrerenderRoute({ name, relativePath: parts.join('/'), attributes: slug ? { slug } : {} }, paths.basePath);
  });
  return [paths.basePath ?? '/docs', ...routes].sort();
}
