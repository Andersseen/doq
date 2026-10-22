import { Route, Routes, UrlMatcher, UrlSegment } from '@angular/router';
import { DoqConfig } from './doq-config';
import { DoqDocsComponent } from './doq-docs.component';
import { DoqIndexComponent } from './doq-index.component';
import { normalizeDoqPaths } from './doq-paths';
import { getDoqVersions } from './doq-versions';

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
  const versionRoutes = (prefix: readonly string[], data: Route['data']): Route[] => [
    { matcher: (segments) => segments.length === prefix.length && matchesPrefix(segments, prefix) ? { consumed: segments, posParams: {} } : null, component: DoqIndexComponent, data },
    {
      matcher: (segments) => {
        if (segments.length <= prefix.length || !matchesPrefix(segments, prefix)) return null;
        return { consumed: segments, posParams: { [routeParam]: new UrlSegment(segments.slice(prefix.length).map(segment => segment.path).join('/'), {}) } };
      },
      component: DoqDocsComponent,
      data,
    },
  ];
  if (!versioning) return versionRoutes(base, undefined);
  const archives = getDoqVersions({ contentDirectory: 'docs', basePath, versioning }).filter(version => !version.current);
  const reserved = [...base, versioning.pathSegment];
  const unknownVersion: UrlMatcher = (segments) => segments.length > base.length && matchesPrefix(segments, reserved) ? { consumed: segments, posParams: {} } : null;
  const current = versionRoutes(base, { doqVersion: versioning.current.id });
  // The current document matcher must not capture the reserved prefix: an unconfigured version is "not found", never a current slug.
  const [currentIndex, currentDocument] = current as [Route, Route];
  const guardedDocument: Route = {
    ...currentDocument,
    matcher: (segments, group, route) => (segments.length > reserved.length - 1 && matchesPrefix(segments, reserved) ? null : (currentDocument.matcher as UrlMatcher)(segments, group, route)),
  };
  return [
    ...archives.flatMap(version => versionRoutes(version.basePath.split('/').filter(Boolean), { doqVersion: version.id })),
    { matcher: unknownVersion, component: DoqDocsComponent, data: { doqUnknownVersion: true } },
    currentIndex,
    guardedDocument,
  ];
}
