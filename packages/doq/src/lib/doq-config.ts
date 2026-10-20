import { InjectionToken, Provider, Type } from '@angular/core';

export type DoqDemoRegistry = Readonly<Record<string, Type<unknown>>>;

export interface DoqConfig {
  /** Analog content subdirectory; docs are read from src/content/<directory>. */
  contentDirectory: string;
  /** Public mount path, for example /docs. */
  basePath?: string;
  /** Route parameter carrying the nested path; '**' for an Analog catch-all extra route. */
  routeParam?: string;
  /** Main article width; any valid CSS length. */
  contentWidth?: string;
  /** Show the right-hand heading index. */
  showTableOfContents?: boolean;
  /** Side navigation layout and width. */
  sidebar?: 'left' | 'right' | 'hidden';
  sidebarWidth?: string;
  /** Consumer-owned standalone Angular demos, keyed by stable Markdown frontmatter IDs. */
  demos?: DoqDemoRegistry;
}

export const DOQ_CONFIG = new InjectionToken<DoqConfig>('DOQ_CONFIG');

export function provideDoq(config: DoqConfig): Provider {
  return { provide: DOQ_CONFIG, useValue: { contentWidth: '46rem', showTableOfContents: true, sidebar: 'left', sidebarWidth: '16rem', basePath: '/docs', ...config } };
}
