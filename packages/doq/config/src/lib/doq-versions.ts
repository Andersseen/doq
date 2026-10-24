import { joinDoqPath } from './doq-document';

/** Pure versioning helpers. No Angular, no DOM, no Node: safe to import from vite.config.ts and from the browser bundle. */

/** One documentation version as written in configuration. */
export interface DoqVersionConfig {
  /** Stable identifier; becomes the URL segment of an archive and the search-filter value. Letters, numbers, ".", "_" and "-". */
  readonly id: string;
  /** Text shown in the version selector. Defaults to the id. */
  readonly label?: string;
}

/** An archived documentation snapshot with its own content directory. */
export interface DoqArchiveConfig extends DoqVersionConfig {
  /** Analog content subdirectory holding this snapshot, for example "docs-v1"; must not equal or nest with another version's. */
  readonly contentDirectory: string;
}

/** Optional versioning. The top-level `contentDirectory` stays the current version at its existing URLs. */
export interface DoqVersioning {
  readonly current: DoqVersionConfig;
  /** Archived snapshots, listed in the order the selector shows them (newest first is conventional). */
  readonly archives?: readonly DoqArchiveConfig[];
  /** URL segment that precedes an archive id: `<basePath>/<pathSegment>/<id>`. Default "v". Reserved among the current slugs. */
  readonly pathSegment?: string;
  /** Optional absolute site origin ("https://docs.example.com"). When set, each page declares its own canonical URL. */
  readonly canonicalOrigin?: string;
}

export interface DoqResolvedVersioning {
  readonly current: { readonly id: string; readonly label: string };
  readonly archives: readonly { readonly id: string; readonly label: string; readonly contentDirectory: string }[];
  readonly pathSegment: string;
  readonly canonicalOrigin?: string;
}

/** A resolved version: where its content lives and where its pages are mounted. */
export interface DoqVersion {
  readonly id: string;
  readonly label: string;
  readonly contentDirectory: string;
  /** Mount path of the version index; the current version keeps the configured `basePath`. */
  readonly basePath: string;
  readonly current: boolean;
}

/** Pagefind filter that carries the version id on every indexed page of a versioned site. */
export const DOQ_VERSION_FILTER = 'doqsVersion';
export const DEFAULT_DOQ_VERSION_SEGMENT = 'v';
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SEGMENT = /^[A-Za-z][A-Za-z0-9-]*$/;

/** Slash-free, traversal-free content directory, or undefined when the value is unusable. */
export function normalizeContentDirectory(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const directory = value.replace(/\\/g, '/').split('/').filter(Boolean);
  return directory.length && !directory.some(part => part === '.' || part === '..') ? directory.join('/') : undefined;
}

const nests = (a: string, b: string) => a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);

/** Validate the optional `versioning` setting against the current content directory. Throws one actionable message. */
export function normalizeDoqVersioning(versioning: DoqVersioning, currentContentDirectory: string): DoqResolvedVersioning {
  if (versioning === null || typeof versioning !== 'object') throw new Error('Doq: versioning must be an object such as { current: { id: "latest" }, archives: [...] }.');
  const readId = (value: unknown, where: string) => {
    if (typeof value !== 'string' || !ID.test(value)) {
      throw new Error(`Doq: invalid version id ${JSON.stringify(value)} in ${where}; use letters, numbers, ".", "_" or "-", starting with a letter or number.`);
    }
    return value;
  };
  const readLabel = (label: unknown, id: string) => {
    if (label === undefined) return id;
    if (typeof label !== 'string' || !label.trim()) throw new Error(`Doq: version "${id}" has an empty label.`);
    return label.trim();
  };
  const pathSegment = versioning.pathSegment ?? DEFAULT_DOQ_VERSION_SEGMENT;
  if (typeof pathSegment !== 'string' || !SEGMENT.test(pathSegment)) {
    throw new Error(`Doq: invalid versioning.pathSegment ${JSON.stringify(pathSegment)}; use a single URL segment such as "v".`);
  }
  if (!versioning.current || typeof versioning.current !== 'object') throw new Error('Doq: versioning.current is required, for example { id: "latest", label: "Latest" }.');
  const currentId = readId(versioning.current.id, 'versioning.current');
  const current = { id: currentId, label: readLabel(versioning.current.label, currentId) };
  if (versioning.archives !== undefined && !Array.isArray(versioning.archives)) throw new Error('Doq: versioning.archives must be an array.');
  const ids = new Set([current.id.toLowerCase()]);
  const directories: string[] = [currentContentDirectory];
  const archives = (versioning.archives ?? []).map((archive, index) => {
    const id = readId(archive?.id, `versioning.archives[${index}]`);
    if (ids.has(id.toLowerCase())) throw new Error(`Doq: duplicate version id "${id}".`);
    ids.add(id.toLowerCase());
    const contentDirectory = normalizeContentDirectory(archive.contentDirectory);
    if (!contentDirectory) throw new Error(`Doq: version "${id}" needs a contentDirectory below src/content, for example "docs-${id}".`);
    const clash = directories.find(directory => nests(directory, contentDirectory));
    if (clash) throw new Error(`Doq: version "${id}" content directory "${contentDirectory}" overlaps "${clash}"; every version needs its own separate directory.`);
    directories.push(contentDirectory);
    return { id, label: readLabel(archive.label, id), contentDirectory };
  });
  let canonicalOrigin: string | undefined;
  if (versioning.canonicalOrigin !== undefined) {
    const origin = typeof versioning.canonicalOrigin === 'string' ? versioning.canonicalOrigin.trim().replace(/\/+$/, '') : '';
    if (!/^https?:\/\/[^\s/?#]+$/i.test(origin)) throw new Error(`Doq: invalid versioning.canonicalOrigin ${JSON.stringify(versioning.canonicalOrigin)}; use an origin such as "https://docs.example.com".`);
    canonicalOrigin = origin;
  }
  return { current, archives, pathSegment, ...(canonicalOrigin ? { canonicalOrigin } : {}) };
}

/** Current version first, then archives in configured order. An unversioned configuration has one current version. */
export function getDoqVersions(paths: { contentDirectory: string; basePath: string; versioning?: DoqResolvedVersioning }): readonly DoqVersion[] {
  const { versioning } = paths;
  const current: DoqVersion = {
    id: versioning?.current.id ?? 'current',
    label: versioning?.current.label ?? 'Current',
    contentDirectory: paths.contentDirectory,
    basePath: paths.basePath,
    current: true,
  };
  if (!versioning) return [current];
  return [
    current,
    ...versioning.archives.map(archive => ({
      ...archive,
      basePath: joinDoqPath(paths.basePath, `${versioning.pathSegment}/${archive.id}`),
      current: false,
    })),
  ];
}

/** Reject a current-version slug whose first segment would shadow the archive URL prefix. */
export function assertDoqSlugNotReserved(slug: string, pathSegment: string | undefined, source: string): void {
  if (pathSegment && slug.split('/')[0] === pathSegment) {
    throw new Error(`Doq: slug "${slug}" in ${source} collides with the reserved archive prefix "${pathSegment}/"; rename the document or set versioning.pathSegment.`);
  }
}

export interface DoqVersionLink {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly current: boolean;
  readonly active: boolean;
  /** True when the same document exists in this version; false when the link falls back to the version index. */
  readonly sameDocument: boolean;
}

/**
 * Destination for every version while reading `slug` (null on an index page). A version that has the same public slug links
 * to it; any other version links to its own index. Nothing is guessed from similar names.
 */
export function doqVersionLinks(
  versions: readonly DoqVersion[],
  activeId: string,
  slug: string | null,
  catalogs: Readonly<Record<string, readonly { readonly slug: string }[]>>,
): DoqVersionLink[] {
  return versions.map(version => {
    const sameDocument = !!slug && (catalogs[version.id] ?? []).some(doc => doc.slug === slug);
    return {
      id: version.id,
      label: version.label,
      href: sameDocument ? joinDoqPath(version.basePath, slug!) : version.basePath,
      current: version.current,
      active: version.id === activeId,
      sameDocument: sameDocument || !slug,
    };
  });
}

/** Absolute canonical URL of an in-app path, or undefined when no `canonicalOrigin` is configured. */
export function doqCanonicalUrl(versioning: DoqResolvedVersioning | undefined, path: string): string | undefined {
  return versioning?.canonicalOrigin ? `${versioning.canonicalOrigin}${path === '/' ? '/' : path}` : undefined;
}
