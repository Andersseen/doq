import { inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { injectContentFiles } from '@analogjs/content';
import { DOQ_CONFIG, DoqConfig } from '@doqs/analog/config';
import { DoqDocument, DoqDocumentAttributes, normalizeDoqDocument, sortDoqDocuments } from '@doqs/analog/config';
import { normalizeDoqPaths } from '@doqs/analog/config';
import { assertDoqSlugNotReserved, DoqVersion, getDoqVersions } from '@doqs/analog/config';

/**
 * Sorted, de-duplicated documents of one version of the configured tree (the current version by default).
 * Each version reads only its own content directory, so catalogs never mix. Call from an injection context.
 */
export function injectDoqDocuments(config: DoqConfig = inject(DOQ_CONFIG), versionId?: string): readonly DoqDocument[] {
  const paths = normalizeDoqPaths(config);
  const versions = getDoqVersions(paths);
  const version = versionId === undefined ? versions[0] : versions.find(candidate => candidate.id === versionId);
  if (!version) throw new Error(`Doq: unknown documentation version "${versionId}".`);
  const { contentDirectory, basePath } = version;
  const files = injectContentFiles<DoqDocumentAttributes>(file => file.filename.includes(`/content/${contentDirectory}/`));
  const documents = files.map(file => normalizeDoqDocument(file, contentDirectory, basePath)).filter((doc): doc is DoqDocument => !!doc);
  if (version.current) for (const doc of documents) assertDoqSlugNotReserved(doc.slug, paths.versioning?.pathSegment, doc.sourceFilename);
  else if (!documents.length) throw new Error(`Doq: version "${version.id}" has no Markdown documents in src/content/${contentDirectory}/.`);
  return sortDoqDocuments(documents);
}

/** Catalogs of every configured version, keyed by version id; used to resolve where the version selector points. */
export function injectDoqCatalogs(config: DoqConfig = inject(DOQ_CONFIG)): Readonly<Record<string, readonly DoqDocument[]>> {
  return Object.fromEntries(getDoqVersions(normalizeDoqPaths(config)).map(version => [version.id, injectDoqDocuments(config, version.id)]));
}

export interface DoqVersionContext {
  readonly versions: readonly DoqVersion[];
  /** The version the routed page belongs to (the current version for an unknown version URL). */
  readonly version: DoqVersion;
  /** True when the URL names an archive that is not configured. */
  readonly unknown: boolean;
  readonly versioned: boolean;
}

/** Version of the routed page, taken from the route data written by doqRoutes(). Call from an injection context. */
export function injectDoqVersion(config: DoqConfig = inject(DOQ_CONFIG)): DoqVersionContext {
  const data = inject(ActivatedRoute).snapshot.data;
  const paths = normalizeDoqPaths(config);
  const versions = getDoqVersions(paths);
  const requested = data['doqVersion'] as string | undefined;
  const version = (requested === undefined ? undefined : versions.find(candidate => candidate.id === requested)) ?? versions[0]!;
  return { versions, version, unknown: !!data['doqUnknownVersion'], versioned: !!paths.versioning };
}

/** Copy used by the built-in components; unset values fall back to Doq's defaults. */
export function resolveDoqCopy(config: DoqConfig) {
  const p = config.presentation ?? {};
  const label = p.documentationLabel?.trim();
  return {
    label: label || 'Documentation',
    breadcrumbRoot: label || 'Docs',
    indexTitle: p.indexTitle?.trim() || 'Explore the docs',
    indexDescription: p.indexDescription?.trim() || 'Browse guides and references for this product.',
    pageTitleSuffix: p.pageTitleSuffix === undefined ? 'Documentation' : p.pageTitleSuffix.trim(),
    hasIndexTitle: !!p.indexTitle?.trim(),
    hasIndexDescription: !!p.indexDescription?.trim(),
  };
}
