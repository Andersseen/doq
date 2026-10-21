import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideFileRouter, requestContextInterceptor, withExtraRoutes } from '@analogjs/router';
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { defineDoqConfig, doqRoutes, provideDoq } from '@doqs/analog';
import { doqPaths } from '../doq.paths';
import { ForgeQueryDemoComponent } from './demos/query-demo';
import { ForgeSchemaDemoComponent } from './demos/schema-demo';
import { ForgeOnboardingComponent } from './slots/forge-onboarding';
import { ForgeTokenNoteComponent } from './slots/forge-token-note';

const doqConfig = defineDoqConfig({
  ...doqPaths,
  contentWidth: '49rem',
  sidebar: 'right',
  sidebarWidth: '13rem',
  showTableOfContents: false,
  // `vite build --mode nosearch` builds the search-disabled variant that the E2E suite compares against.
  search: { enabled: import.meta.env.MODE !== 'nosearch' },
  demos: { 'forge-schema': ForgeSchemaDemoComponent, 'forge-query': ForgeQueryDemoComponent },
  slots: { indexAfterIntro: ForgeOnboardingComponent, documentAfterContent: ForgeTokenNoteComponent },
  presentation: {
    indexTitle: 'ForgeCMS developer hub',
    indexDescription: 'Model content, query it over the delivery API and ship it to every environment.',
    pageTitleSuffix: 'ForgeCMS Developers',
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideFileRouter(withExtraRoutes(doqRoutes(doqConfig))),
    provideContent(withMarkdownRenderer()),
    provideDoq(doqConfig),
    provideHttpClient(withInterceptors([requestContextInterceptor])), provideClientHydration(withEventReplay()),
  ],
};
