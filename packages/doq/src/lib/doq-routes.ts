import { Routes, UrlMatcher, UrlSegment } from '@angular/router';
import { DoqConfig } from './doq-config';
import { DoqDocsComponent } from './doq-docs.component';
import { DoqIndexComponent } from './doq-index.component';

/** Public Angular Router bridge. It captures the nested path as one Analog content slug. */
export function doqRoutes(config: Pick<DoqConfig, 'basePath' | 'routeParam'> = {}): Routes {
  const base = (config.basePath ?? '/docs').split('/').filter(Boolean);
  const routeParam = config.routeParam ?? 'slug';
  const matchesBase = (segments: UrlSegment[]) => base.every((part, index) => segments[index]?.path === part);
  const indexMatcher: UrlMatcher = (segments) => {
    if (segments.length !== base.length || !matchesBase(segments)) return null;
    return { consumed: segments, posParams: {} };
  };
  const documentMatcher: UrlMatcher = (segments) => {
    if (segments.length <= base.length || !matchesBase(segments)) return null;
    const slug = segments.slice(base.length).map(segment => segment.path).join('/');
    return { consumed: segments, posParams: { [routeParam]: new UrlSegment(slug, {}) } };
  };
  return [
    { matcher: indexMatcher, component: DoqIndexComponent },
    { matcher: documentMatcher, component: DoqDocsComponent },
  ];
}
