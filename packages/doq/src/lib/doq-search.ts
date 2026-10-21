/** Optional full-text search. Pure helpers only: no Angular, no DOM, safe to import at build time. */

export interface DoqSearchConfig {
  /** Show the search trigger and dialog. Default false. */
  enabled?: boolean;
  /** Where the static Pagefind bundle is served: an absolute path or http(s) URL. Default "/pagefind/". Independent of `basePath`. */
  bundlePath?: string;
}

export interface DoqResolvedSearchConfig {
  readonly enabled: boolean;
  readonly bundlePath: string;
}

export const DEFAULT_DOQ_SEARCH_BUNDLE_PATH = '/pagefind/';

/** Validate the optional `search` setting; the bundle path always ends with "/". */
export function normalizeDoqSearchConfig(search: DoqSearchConfig | undefined): DoqResolvedSearchConfig {
  if (search === undefined) return { enabled: false, bundlePath: DEFAULT_DOQ_SEARCH_BUNDLE_PATH };
  if (search === null || typeof search !== 'object') throw new Error('Doq: search must be an object such as { enabled: true }.');
  if (search.enabled !== undefined && typeof search.enabled !== 'boolean') {
    throw new Error(`Doq: search.enabled must be a boolean, received ${JSON.stringify(search.enabled)}.`);
  }
  let bundlePath = DEFAULT_DOQ_SEARCH_BUNDLE_PATH;
  if (search.bundlePath !== undefined) {
    const raw = typeof search.bundlePath === 'string' ? search.bundlePath.trim() : '';
    const isUrl = /^https?:\/\/[^\s/]+/i.test(raw);
    const isPath = raw.startsWith('/') && !raw.startsWith('//');
    const segments = raw.replace(/[?#].*$/, '').split('/');
    if (!raw || !(isUrl || isPath) || /[\s\\]/.test(raw) || segments.includes('..') || segments.includes('.') || /[?#]/.test(raw)) {
      throw new Error(`Doq: invalid search.bundlePath "${search.bundlePath}"; use an absolute path such as "/pagefind/" or an http(s) URL.`);
    }
    bundlePath = raw.endsWith('/') ? raw : `${raw}/`;
  }
  return { enabled: search.enabled === true, bundlePath };
}

/** One Pagefind result in the shape the UI renders. */
export interface DoqSearchResult {
  /** Canonical in-app URL, possibly with a #fragment. */
  readonly url: string;
  readonly title: string;
  /** Heading the match belongs to, when the match is inside a section. */
  readonly section?: string;
  readonly excerpt: readonly DoqExcerptSegment[];
}

export interface DoqExcerptSegment {
  readonly text: string;
  readonly mark: boolean;
}

/**
 * Turn a Pagefind result URL into a router URL below `basePath`. Origins, `index.html`, `.html` and trailing
 * slashes are removed, the fragment is kept. Returns undefined for URLs outside the Doq base path.
 */
export function normalizeSearchResultUrl(url: string, basePath: string): string | undefined {
  let path = url.trim().replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '');
  const hashIndex = path.indexOf('#');
  const fragment = hashIndex < 0 ? '' : path.slice(hashIndex + 1);
  path = (hashIndex < 0 ? path : path.slice(0, hashIndex)).replace(/\?.*$/, '');
  if (!path.startsWith('/') || path.startsWith('//') || path.split('/').includes('..')) return undefined;
  path = path.replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/\/+$/, '');
  const base = `/${basePath.split('/').filter(Boolean).join('/')}`;
  if (path !== base && !path.startsWith(`${base}/`)) return undefined;
  return fragment ? `${path}#${fragment}` : path;
}

const ENTITIES: Record<string, string> = { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&#x27;': "'", '&nbsp;': ' ' };

/**
 * Split a Pagefind excerpt into plain-text segments. Only `<mark>` boundaries are honored; every other tag is
 * dropped and entities are decoded, so the result is safe to bind as text.
 */
export function excerptSegments(excerpt: string): DoqExcerptSegment[] {
  const segments: DoqExcerptSegment[] = [];
  let mark = false;
  for (const part of excerpt.split(/(<\/?mark\b[^>]*>)/i)) {
    if (/^<mark\b/i.test(part)) mark = true;
    else if (/^<\/mark/i.test(part)) mark = false;
    else {
      const text = part.replace(/<[^>]*>/g, '').replace(/&(?:lt|gt|amp|quot|nbsp|#39|#x27);/g, entity => ENTITIES[entity] ?? entity);
      if (text) segments.push({ text, mark });
    }
  }
  return segments;
}

/** Subset of Pagefind's result data that Doq reads. */
export interface PagefindFragment {
  url?: string;
  excerpt?: string;
  meta?: Record<string, string | undefined>;
  sub_results?: { title?: string; url?: string; excerpt?: string; anchor?: { id?: string } | null }[];
}

/** Map one Pagefind page to up to `maxPerPage` rows: anchored sections when present, otherwise the page excerpt. */
export function mapPagefindFragment(fragment: PagefindFragment, basePath: string, maxPerPage = 2): DoqSearchResult[] {
  const pageUrl = normalizeSearchResultUrl(fragment.url ?? '', basePath);
  if (!pageUrl) return [];
  const title = fragment.meta?.['title']?.trim() || pageUrl.split('/').pop() || pageUrl;
  const rows: DoqSearchResult[] = [];
  for (const sub of fragment.sub_results ?? []) {
    if (rows.length >= maxPerPage) break;
    const url = normalizeSearchResultUrl(sub.url ?? '', basePath);
    if (!url || !sub.anchor?.id || sub.title?.trim() === title) continue;
    rows.push({ url, title, section: sub.title?.trim() || undefined, excerpt: excerptSegments(sub.excerpt ?? '') });
  }
  if (!rows.length) rows.push({ url: pageUrl, title, excerpt: excerptSegments(fragment.excerpt ?? '') });
  return rows;
}

/**
 * Query ordering guard: `next()` returns a ticket and only the newest ticket is `isCurrent()`, so a slow earlier
 * response can never replace the results of a later query.
 */
export function createLatestGate() {
  let latest = 0;
  return {
    next: () => ++latest,
    isCurrent: (ticket: number) => ticket === latest,
    cancel: () => void ++latest,
  };
}
