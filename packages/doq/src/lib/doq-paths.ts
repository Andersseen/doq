import { doqPrerenderRoute } from './doq-document';
import { DoqResolvedVersioning, DoqVersioning, getDoqVersions, normalizeContentDirectory, normalizeDoqVersioning } from './doq-versions';

/** The two values shared by Angular runtime config and Analog's build-time prerender config. */
export interface DoqPaths {
  /** Analog content subdirectory; docs are read from src/content/<contentDirectory>. */
  readonly contentDirectory: string;
  /** Public mount path, for example /docs, or "/" when the whole application is documentation. Defaults to /docs. */
  readonly basePath?: string;
  /** Optional documentation versions: this `contentDirectory` stays the current version; archives are separate snapshots. */
  readonly versioning?: DoqVersioning;
}

/** Analog `prerender.routes` entry that expands a content directory into routes. */
export interface DoqPrerenderContentRoute {
  contentDir: string;
  recursive: true;
  transform: (file: { name: string; relativePath?: string; attributes?: { slug?: unknown } }) => string;
}

/** Trim and validate path settings; returns slash-free `contentDirectory` and a `/`-prefixed `basePath` ("/" for the root). */
export function normalizeDoqPaths(paths: DoqPaths): { contentDirectory: string; basePath: string; versioning?: DoqResolvedVersioning } {
  const contentDirectory = normalizeContentDirectory(paths.contentDirectory ?? '');
  if (!contentDirectory) {
    throw new Error(`Doq: invalid contentDirectory "${paths.contentDirectory}"; use a directory below src/content, for example "docs".`);
  }
  const rawBasePath = (paths.basePath ?? '/docs').trim();
  const segments = rawBasePath.split('/').filter(Boolean);
  // "/" mounts the documentation at the application root; an empty string is still a mistake.
  const isRoot = rawBasePath.length > 0 && !segments.length;
  if ((!segments.length && !isRoot) || segments.some(part => part === '.' || part === '..')) {
    throw new Error(`Doq: invalid basePath "${paths.basePath}"; use a mount path such as "/docs", or "/" for the application root.`);
  }
  const result = { contentDirectory, basePath: `/${segments.join('/')}` };
  return paths.versioning === undefined ? result : { ...result, versioning: normalizeDoqVersioning(paths.versioning, contentDirectory) };
}

/**
 * Analog prerender routes for a Doq documentation tree: the index plus every Markdown file below
 * `src/content/<contentDirectory>`, mapped to its canonical (or custom-slug) public URL.
 * Spread the result into `analog({ prerender: { routes: async () => ['/', ...doqPrerenderRoutes(doqPaths)] } })`.
 */
export function doqPrerenderRoutes(paths: DoqPaths): readonly (string | DoqPrerenderContentRoute)[] {
  const normalized = normalizeDoqPaths(paths);
  const reserved = normalized.versioning?.pathSegment;
  return getDoqVersions(normalized).flatMap((version): (string | DoqPrerenderContentRoute)[] => [
    version.basePath,
    {
      contentDir: `src/content/${version.contentDirectory}`,
      recursive: true,
      transform: file => doqPrerenderRoute(file, version.basePath, version.current ? reserved : undefined),
    },
  ]);
}
