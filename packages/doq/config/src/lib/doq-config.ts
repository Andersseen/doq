import { InjectionToken, Provider, Type } from '@angular/core';
import { DoqPaths, normalizeDoqPaths } from './doq-paths';
import { DoqSearchConfig, normalizeDoqSearchConfig } from './doq-search';
import { DoqPlaygroundRegistry, validateDoqPlaygrounds } from './doq-playground-model';

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

/**
 * Who renders the page's `main` landmark.
 * - `'document'` (default): Doqs does. The documentation index, document and not-found views each render exactly one `main`, and
 *   `DoqShellComponent` renders a plain container around them. Right for docs-first apps and for hosts whose layout has no `main`.
 * - `'host'`: the host layout does. Doqs views render no `main`; the host (or `DoqShellComponent`) must provide the single one,
 *   which is what an application embedding documentation inside its own `<main>` needs.
 * Decided from configuration alone, so server-rendered HTML and the hydrated DOM always agree.
 */
export type DoqLandmark = 'document' | 'host';

/**
 * What `doqRoutes()` does with a URL under the base path that has no Markdown document.
 * - `'not-found'` (default): Doqs claims every URL below the base path and renders its "page not found" view.
 * - `'continue'`: Doqs claims only URLs it has a document for, and the router carries on with the next route, so host-owned pages
 *   (and the host's own 404) keep working below the same prefix. Use it to migrate pages one at a time without changing a URL.
 *   The current version's index (the bare base path) is then left to the host; archive indexes stay with Doqs.
 */
export type DoqUnmatched = 'not-found' | 'continue';

export interface DoqConfig extends DoqPaths {
  /** Main landmark ownership (default `'document'`); see {@link DoqLandmark}. */
  landmark?: DoqLandmark;
  /** Behavior for base-path URLs without a document (default `'not-found'`); see {@link DoqUnmatched}. */
  unmatched?: DoqUnmatched;
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
  /** Consumer-owned interactive playgrounds, keyed by the stable IDs used in `::playground[id]`. Additive; demos are unchanged. */
  playgrounds?: DoqPlaygroundRegistry;
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
  if (config.landmark !== undefined && config.landmark !== 'document' && config.landmark !== 'host')
    throw new Error(`Doq: landmark must be 'document' or 'host', received ${JSON.stringify(config.landmark)}.`);
  if (config.unmatched !== undefined && config.unmatched !== 'not-found' && config.unmatched !== 'continue')
    throw new Error(`Doq: unmatched must be 'not-found' or 'continue', received ${JSON.stringify(config.unmatched)}.`);
  const problems = validateDoqPlaygrounds(config.playgrounds);
  if (problems.length) throw new Error(`Doq: invalid playground configuration:\n- ${problems.join('\n- ')}`);
  return { ...config, ...normalizeDoqPaths(config), ...(config.search === undefined ? {} : { search: normalizeDoqSearchConfig(config.search) }) };
}

export function provideDoq(config: DoqConfig): Provider {
  return { provide: DOQ_CONFIG, useValue: { contentWidth: '46rem', showTableOfContents: true, sidebar: 'left', sidebarWidth: '16rem', ...defineDoqConfig(config) } };
}
