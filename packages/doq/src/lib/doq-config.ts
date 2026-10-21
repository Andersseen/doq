import { InjectionToken, Provider, Type } from '@angular/core';
import { DoqPaths, normalizeDoqPaths } from './doq-paths';
import { DoqSearchConfig, normalizeDoqSearchConfig } from './doq-search';

export type DoqDemoRegistry = Readonly<Record<string, Type<unknown>>>;

/**
 * Host-owned standalone components rendered at stable Doq locations. Slots are created without inputs;
 * a component that needs data injects it from the host application.
 */
export interface DoqSlots {
  /** Rendered on the documentation index, after the introduction and before the document cards. */
  indexAfterIntro?: Type<unknown>;
  /** Rendered on every document page, after the Markdown content and registered demo. */
  documentAfterContent?: Type<unknown>;
}

/** Product-specific copy. Every value is optional; omitted values keep Doq's defaults. */
export interface DoqPresentation {
  /** Small label above headings and the navigation name (default "Documentation"; breadcrumb root defaults to "Docs"). */
  documentationLabel?: string;
  /** Index page heading (default "Explore the docs"). */
  indexTitle?: string;
  /** Index page intro (default "Browse guides and references for this product."). */
  indexDescription?: string;
  /** Appended to document titles as "<title> · <suffix>" (default "Documentation"; '' disables it). */
  pageTitleSuffix?: string;
}

export interface DoqConfig extends DoqPaths {
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
  /** Optional host-owned composition points. */
  slots?: DoqSlots;
  /** Optional product-aware copy and page titles. */
  presentation?: DoqPresentation;
  /** Optional static full-text search. Disabled unless `enabled: true`; see `doq-search` for the indexing step. */
  search?: DoqSearchConfig;
}

export const DOQ_CONFIG = new InjectionToken<DoqConfig>('DOQ_CONFIG');

/** Validate and normalize a configuration once; pass the result to doqRoutes() and provideDoq(). */
export function defineDoqConfig(config: DoqConfig): DoqConfig {
  return { ...config, ...normalizeDoqPaths(config), ...(config.search === undefined ? {} : { search: normalizeDoqSearchConfig(config.search) }) };
}

export function provideDoq(config: DoqConfig): Provider {
  return { provide: DOQ_CONFIG, useValue: { contentWidth: '46rem', showTableOfContents: true, sidebar: 'left', sidebarWidth: '16rem', ...defineDoqConfig(config) } };
}
