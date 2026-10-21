import { Injectable } from '@angular/core';
import { DoqSearchResult, mapPagefindFragment, PagefindFragment } from './doq-search';

interface PagefindModule {
  search(query: string): Promise<{ results: { data(): Promise<PagefindFragment> }[] }>;
}

const MAX_PAGES = 8;
const MAX_ROWS = 12;

/**
 * Data access for the optional static search. The Pagefind bundle is a runtime import from `bundlePath`, so it is never
 * part of the application bundle and is requested only when the reader first searches.
 */
@Injectable({ providedIn: 'root' })
export class DoqSearchService {
  private loading?: { bundlePath: string; module: Promise<PagefindModule> };

  /** Rejects when the index cannot be loaded; a later call retries. */
  search(query: string, bundlePath: string, basePath: string): Promise<DoqSearchResult[]> {
    return this.load(bundlePath).then(async pagefind => {
      const { results } = await pagefind.search(query);
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
