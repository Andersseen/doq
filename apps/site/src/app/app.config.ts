import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { Route } from '@angular/router';
import { provideFileRouter, requestContextInterceptor, withExtraRoutes } from '@analogjs/router';
import { provideVoltTheme } from '@voltui/components';
import { doqPaths } from '../doq.paths';
import { readInitialDark } from './theme';

/**
 * The documentation region is a lazy route: the landing page, which shares this application, loads none of the Doqs
 * components, the Markdown renderer or the syntax highlighter. The empty path consumes nothing, so Doqs's own matchers
 * still see the full URL; `canMatch` limits the region to the documentation mount path. Nothing here imports Doqs or
 * Analog's content package: both are loaded with the region (see docs.routes.ts).
 */
const mountSegment = doqPaths.basePath.split('/').filter(Boolean)[0];
export const docsRoute: Route = {
  path: '',
  canMatch: [(_route, segments) => segments[0]?.path === mountSegment],
  loadChildren: () => import('./docs.routes').then((module) => module.docsRoutes),
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideFileRouter(withExtraRoutes([docsRoute])),
    provideHttpClient(withInterceptors([requestContextInterceptor])),
    provideClientHydration(withEventReplay()),
    provideVoltTheme({ color: 'ember', style: 'soft', dark: readInitialDark() }),
  ],
};
