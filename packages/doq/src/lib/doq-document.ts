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
  const rawSlug = file.attributes.slug?.trim().replace(/^\/+|\/+$/g, '');
  const slug = rawSlug || sourceSlug;
  if (slug.split('/').some(part => !part || part === '.' || part === '..')) return null;
  const sourceParts = sourceSlug.split('/');
  const title = file.attributes.title?.trim() || sourceParts[sourceParts.length - 1] || 'Untitled';
  const prefix = `/${basePath.split('/').filter(Boolean).join('/')}`;
  const routePath = `${prefix}/${slug}`;
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
  return [...documents].sort((a, b) => a.order - b.order || a.routePath.localeCompare(b.routePath));
}
