import { inject } from '@angular/core';
import { CanMatchFn, Route, Routes, UrlMatcher, UrlSegment } from '@angular/router';
import { DOQ_CONFIG, DoqConfig } from '@doqs/analog/config';
import { injectDoqDocuments } from './doq-catalog';
import { DoqDocsComponent } from './doq-docs.component';
import { DoqIndexComponent } from './doq-index.component';
import { normalizeDoqPaths } from '@doqs/analog/config';
import { getDoqVersions } from '@doqs/analog/config';

/**
 * Public Angular Router bridge. It captures the nested path as one Analog content slug.
 * With `versioning`, each archive gets its own index and document route below `<basePath>/<pathSegment>/<id>`; they are
 * listed before the current routes, and the current routes never claim the reserved prefix.
 */
export function doqRoutes(config: Pick<DoqConfig, 'basePath' | 'routeParam' | 'versioning'> = {}): Routes {
  const routeParam = config.routeParam ?? 'slug';
  const { basePath, versioning } = normalizeDoqPaths({ contentDirectory: 'docs', ...config });
  const base = basePath.split('/').filter(Boolean);
  const matchesPrefix = (segments: UrlSegment[], prefix: readonly string[]) => prefix.every((part, index) => segments[index]?.path === part);
  // `unmatched` is read from the same configuration object (`doqRoutes(doqConfig)`); the parameter type stays as in 0.7 so the public signature is unchanged.
  const continues = (config as Pick<DoqConfig, 'unmatched'>).unmatched === 'continue';
  /** `unmatched: 'continue'`: claim a URL only when this version has a document for its slug (read from the injected content catalog). */
  const hasDocument = (versionId: string | undefined, prefixLength: number): CanMatchFn => (_route, segments) => {
    const slug = segments.slice(prefixLength).map(segment => segment.path).join('/');
    return injectDoqDocuments(inject(DOQ_CONFIG), versionId).some(doc => doc.slug === slug);
  };
  const versionRoutes = (prefix: readonly string[], data: Route['data'], versionId: string | undefined, hostOwnsIndex = false): Route[] => [
    ...(hostOwnsIndex ? [] : [{ matcher: (segments: UrlSegment[]) => segments.length === prefix.length && matchesPrefix(segments, prefix) ? { consumed: segments, posParams: {} } : null, component: DoqIndexComponent, data } as Route]),
    {
      matcher: (segments) => {
        if (segments.length <= prefix.length || !matchesPrefix(segments, prefix)) return null;
        return { consumed: segments, posParams: { [routeParam]: new UrlSegment(segments.slice(prefix.length).map(segment => segment.path).join('/'), {}) } };
      },
      component: DoqDocsComponent,
      data,
      ...(continues ? { canMatch: [hasDocument(versionId, prefix.length)] } : {}),
    },
  ];
  if (!versioning) return versionRoutes(base, undefined, undefined, continues);
  const archives = getDoqVersions({ contentDirectory: 'docs', basePath, versioning }).filter(version => !version.current);
  const reserved = [...base, versioning.pathSegment];
  const unknownVersion: UrlMatcher = (segments) => segments.length > base.length && matchesPrefix(segments, reserved) ? { consumed: segments, posParams: {} } : null;
  const current = versionRoutes(base, { doqVersion: versioning.current.id }, versioning.current.id, continues);
  // The current document matcher must not capture the reserved prefix: an unconfigured version is "not found", never a current slug.
  const currentDocument = current[current.length - 1] as Route;
  const currentIndex = current.slice(0, -1);
  const guardedDocument: Route = {
    ...currentDocument,
    matcher: (segments, group, route) => (segments.length > reserved.length - 1 && matchesPrefix(segments, reserved) ? null : (currentDocument.matcher as UrlMatcher)(segments, group, route)),
  };
  return [
    ...archives.flatMap(version => versionRoutes(version.basePath.split('/').filter(Boolean), { doqVersion: version.id }, version.id)),
    { matcher: unknownVersion, component: DoqDocsComponent, data: { doqUnknownVersion: true } },
    ...currentIndex,
    guardedDocument,
  ];
}
