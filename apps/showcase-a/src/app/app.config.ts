import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideFileRouter, requestContextInterceptor, withExtraRoutes } from '@analogjs/router';
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { doqRoutes, provideDoq } from '@getdoq/analog';

const doqConfig = { contentDirectory: 'docs', basePath: '/docs', routeParam: 'slug', contentWidth: '43rem', sidebar: 'left' as const, sidebarWidth: '14rem', showTableOfContents: true };

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideFileRouter(withExtraRoutes(doqRoutes(doqConfig))),
    provideContent(withMarkdownRenderer()),
    provideDoq(doqConfig),
    provideHttpClient(withInterceptors([requestContextInterceptor])), provideClientHydration(withEventReplay()),
  ],
};
