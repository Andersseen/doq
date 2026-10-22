import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideFileRouter, withExtraRoutes } from '@analogjs/router';
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { defineDoqConfig, doqRoutes, provideDoq } from '@doqs/analog';
import { doqPaths } from '../doq.paths';
import { handbookDemos, HandbookSmoothScroll } from './handbook-demos';

const doqConfig = defineDoqConfig({
  ...doqPaths,
  search: { enabled: true },
  demos: handbookDemos,
  slots: { documentAfterContent: HandbookSmoothScroll },
  presentation: { documentationLabel: 'Handbook', pageTitleSuffix: 'Angular Movement' },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideFileRouter(withExtraRoutes(doqRoutes(doqConfig))),
    provideContent(withMarkdownRenderer()),
    provideDoq(doqConfig),
    provideClientHydration(withEventReplay()),
  ],
};
