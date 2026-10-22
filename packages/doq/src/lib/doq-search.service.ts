import { Injectable } from '@angular/core';
import { DoqSearchResult, mapPagefindFragment, PagefindFragment } from './doq-search';
import { DOQ_VERSION_FILTER } from './doq-versions';

interface PagefindModule {
  search(query: string, options?: { filters?: Record<string, string> }): Promise<{ results: { data(): Promise<PagefindFragment> }[] }>;
  filters?(): Promise<Record<string, Record<string, number> | undefined>>;
}

/** The index has no pages carrying the requested documentation version. */
export class DoqVersionNotIndexedError extends Error {}

const MAX_PAGES = 8;
const MAX_ROWS = 12;

/**
 * Data access for the optional static search. The Pagefind bundle is a runtime import from `bundlePath`, so it is never
 * part of the application bundle and is requested only when the reader first searches.
 */
@Injectable({ providedIn: 'root' })
export class DoqSearchService {
  private loading?: { bundlePath: string; module: Promise<PagefindModule> };

  /**
   * Rejects when the index cannot be loaded; a later call retries. With `versionId` the query is filtered by Pagefind itself
   * (before ranking and truncation); a version that was never indexed rejects with DoqVersionNotIndexedError.
   */
  search(query: string, bundlePath: string, basePath: string, versionId?: string): Promise<DoqSearchResult[]> {
    return this.load(bundlePath).then(async pagefind => {
      if (versionId !== undefined) {
        const known = (await pagefind.filters?.())?.[DOQ_VERSION_FILTER];
        if (!known || !(versionId in known)) throw new DoqVersionNotIndexedError(versionId);
      }
      const { results } = await pagefind.search(query, versionId === undefined ? undefined : { filters: { [DOQ_VERSION_FILTER]: versionId } });
      const pages = await Promise.all(results.slice(0, MAX_PAGES).map(result => result.data()));
      return pages.flatMap(page => mapPagefindFragment(page, basePath)).slice(0, MAX_ROWS);
    });
  }

  private load(bundlePath: string): Promise<PagefindModule> {
    if (this.loading?.bundlePath !== bundlePath) {
      const module = import(/* @vite-ignore */ `${bundlePath}pagefind.js`) as Promise<PagefindModule>;
      const entry = { bundlePath, module };
      this.loading = entry;
      module.catch(() => { if (this.loading === entry) this.loading = undefined; });
    }
    return this.loading.module;
  }
}
