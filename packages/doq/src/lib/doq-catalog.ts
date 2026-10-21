import { inject } from '@angular/core';
import { injectContentFiles } from '@analogjs/content';
import { DOQ_CONFIG, DoqConfig } from './doq-config';
import { DoqDocument, DoqDocumentAttributes, normalizeDoqDocument, sortDoqDocuments } from './doq-document';
import { normalizeDoqPaths } from './doq-paths';

/** Sorted, de-duplicated documents of the configured tree. Call from an injection context. */
export function injectDoqDocuments(config: DoqConfig = inject(DOQ_CONFIG)): readonly DoqDocument[] {
  const { contentDirectory, basePath } = normalizeDoqPaths(config);
  const files = injectContentFiles<DoqDocumentAttributes>(file => file.filename.includes(`/content/${contentDirectory}/`));
  return sortDoqDocuments(files.map(file => normalizeDoqDocument(file, contentDirectory, basePath)).filter((doc): doc is DoqDocument => !!doc));
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
