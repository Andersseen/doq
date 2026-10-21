import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideFileRouter, requestContextInterceptor, withExtraRoutes } from '@analogjs/router';
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { defineDoqConfig, doqRoutes, provideDoq } from '@getdoq/analog';
import { doqPaths } from '../doq.paths';
import { VantaButtonDemoComponent } from './demos/button-demo';
import { VantaHelpComponent } from './slots/vanta-help';
import { VantaStartComponent } from './slots/vanta-start';

const doqConfig = defineDoqConfig({
  ...doqPaths,
  contentWidth: '43rem',
  sidebar: 'left',
  sidebarWidth: '14rem',
  showTableOfContents: true,
  demos: { 'vanta-button': VantaButtonDemoComponent },
  slots: { indexAfterIntro: VantaStartComponent, documentAfterContent: VantaHelpComponent },
  presentation: {
    documentationLabel: 'Vanta UI docs',
    indexTitle: 'Build with Vanta UI',
    indexDescription: 'Component guides, theming and routing recipes for teams shipping thoughtful interfaces.',
    pageTitleSuffix: 'Vanta UI',
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
