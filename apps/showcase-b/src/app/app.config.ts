import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideFileRouter, requestContextInterceptor, withExtraRoutes } from '@analogjs/router';
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { defineDoqConfig, doqRoutes, formatDoqUsage, provideDoq } from '@doqs/analog';
import { doqPaths } from '../doq.paths';
import { ForgeQueryDemoComponent } from './demos/query-demo';
import { ForgeRequestPlaygroundComponent, ForgeRetryPlaygroundComponent } from './demos/request-playground';
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
  playgrounds: {
    'forge-request': {
      component: ForgeRequestPlaygroundComponent,
      title: 'Delivery request',
      description: 'Build a delivery API request and send it.',
      previewSizes: false,
      controls: [
        { input: 'collection', kind: 'string', label: 'Collection', initial: 'product-guides', required: true, description: 'The collection to query.' },
        { input: 'limit', kind: 'number', label: 'Limit', initial: 20, min: 1, max: 100, step: 1, description: 'Between 1 and 100.' },
        { input: 'locale', kind: 'select', label: 'Locale', initial: 'en', options: [{ label: 'English', value: 'en' }, { label: 'Deutsch', value: 'de' }, { label: 'Español', value: 'es' }] },
        { input: 'drafts', kind: 'boolean', label: 'Include drafts' },
      ],
      outputs: [{ event: 'sent', label: 'Request sent' }],
      code: [{ label: 'Angular', language: 'html', code: values => formatDoqUsage('forge-request-playground', values) }],
    },
    'forge-retry': {
      component: ForgeRetryPlaygroundComponent,
      title: 'Retry policy',
      previewSizes: false,
      controls: [
        { input: 'retries', kind: 'number', label: 'Retries', initial: 3, min: 0, max: 6, step: 1, required: true },
        { input: 'baseDelayMs', kind: 'number', label: 'Base delay (ms)', initial: 200, min: 50, max: 5000 },
        { input: 'backoff', kind: 'select', label: 'Backoff', initial: 'exponential', options: [{ label: 'Fixed', value: 'fixed' }, { label: 'Exponential', value: 'exponential' }] },
      ],
      outputs: [{ event: 'attempted', label: 'Attempt' }],
      code: [
        { label: 'Template', language: 'html', code: values => formatDoqUsage('forge-retry-playground', values) },
        { label: 'Component', language: 'ts', code: "import { ForgeRetryPlaygroundComponent } from './retry-playground';\n\n@Component({ imports: [ForgeRetryPlaygroundComponent], templateUrl: './page.html' })\nexport class PageComponent {}" },
      ],
    },
  },
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
