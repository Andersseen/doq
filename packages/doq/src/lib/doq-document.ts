export interface DoqDocumentAttributes {
  title?: string;
  description?: string;
  group?: string;
  order?: number;
  slug?: string;
  demo?: string;
}

export interface DoqDocument {
  sourceFilename: string;
  sourceSlug: string;
  routePath: string;
  slug: string;
  title: string;
  description: string;
  group: string;
  order: number;
  headings: readonly { id: string; text: string; level: number }[];
  attributes: DoqDocumentAttributes;
}

/** Public URL of `slug` below `basePath` ("/docs" + "a/b" → "/docs/a/b"; "/" + "a/b" → "/a/b"). */
export function joinDoqPath(basePath: string, slug: string): string {
  return `/${[...basePath.split('/').filter(Boolean), slug].filter(Boolean).join('/')}`;
}

/** Normalize Analog's content-file metadata into the single URL/navigation model Doq uses. */
export function normalizeDoqDocument(
  file: { filename: string; attributes: DoqDocumentAttributes; toc?: DoqDocument['headings'] },
  contentDirectory: string,
  basePath: string,
): DoqDocument | null {
  const root = `src/content/${contentDirectory.replace(/^\/+|\/+$/g, '')}/`;
  const filename = file.filename.replace(/\\/g, '/');
  const rootIndex = filename.lastIndexOf(root);
  if (rootIndex < 0 || (rootIndex > 0 && filename[rootIndex - 1] !== '/') || !filename.endsWith('.md')) return null;
  const sourceSlug = filename.slice(rootIndex + root.length, -3).replace(/\/index$/, '');
  if (!sourceSlug || sourceSlug.split('/').some(part => !part || part === '.' || part === '..')) return null;
  const explicitSlug = file.attributes.slug;
  if (explicitSlug !== undefined && (typeof explicitSlug !== 'string' || !explicitSlug.trim())) {
    throw new Error(`Doq: invalid empty slug in ${filename}`);
  }
  const rawSlug = explicitSlug?.trim().replace(/^\/+|\/+$/g, '');
  const slug = rawSlug || sourceSlug;
  if (slug.split('/').some(part => !/^[\p{L}\p{N}_~-]+$/u.test(part))) {
    throw new Error(`Doq: invalid slug "${slug}" in ${filename}; use non-empty path segments containing letters, numbers, "_", "-", or "~".`);
  }
  const sourceParts = sourceSlug.split('/');
  const title = file.attributes.title?.trim() || sourceParts[sourceParts.length - 1] || 'Untitled';
  const routePath = joinDoqPath(basePath, slug);
  return {
    sourceFilename: filename,
    sourceSlug,
    routePath,
    slug,
    title,
    description: file.attributes.description?.trim() || '',
    group: file.attributes.group?.trim() || sourceSlug.split('/').slice(0, -1).join(' / ') || 'Guide',
    order: Number.isFinite(file.attributes.order) ? file.attributes.order! : 100,
    headings: file.toc ?? [],
    attributes: file.attributes,
  };
}

export function sortDoqDocuments(documents: readonly DoqDocument[]): DoqDocument[] {
  const sorted = [...documents].sort((a, b) => a.order - b.order || a.routePath.localeCompare(b.routePath));
  const routes = new Map<string, DoqDocument>();
  for (const document of sorted) {
    const previous = routes.get(document.routePath);
    if (previous) {
      throw new Error(`Doq: duplicate public route "${document.routePath}" from ${previous.sourceFilename} and ${document.sourceFilename}.`);
    }
    routes.set(document.routePath, document);
  }
  return sorted;
}

/** Build the static URL for one file supplied by Analog's recursive content prerender route. */
export function doqPrerenderRoute(
  file: { name: string; relativePath?: string; attributes?: { slug?: unknown } },
  basePath = '/docs',
): string {
  const customSlug = file.attributes?.slug;
  let slug: string;
  if (customSlug !== undefined) {
    if (typeof customSlug !== 'string' || !customSlug.trim()) throw new Error(`Doq: invalid empty slug in prerender entry "${file.name}".`);
    slug = customSlug.trim().replace(/^\/+|\/+$/g, '');
  } else {
    slug = [file.relativePath, file.name].filter(Boolean).join('/').replace(/\/index$/, '');
  }
  if (!slug || slug.split('/').some(part => !/^[\p{L}\p{N}_~-]+$/u.test(part))) {
    throw new Error(`Doq: invalid prerender slug "${slug}" for "${file.name}".`);
  }
  return joinDoqPath(basePath, slug);
}
