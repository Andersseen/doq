# Changelog

## Unreleased

### Added
- `basePath: '/'` mounts the documentation at the application root, for sites that are documentation only. The index is served at `/` and documents at `/<slug>`; `doqRoutes`, `doqPrerenderRoutes`, document routes, pagination and search result URLs all honour it. `basePath: ''` is still rejected.
- Export `joinDoqPath(basePath, slug)`, the single place that builds public document URLs.

## 0.3.0

Interactive Markdown. Additive: every 0.2 configuration, document, route and `demo:` frontmatter key works unchanged, and documents without a directive render the same single Markdown region as before.

### Added
- `::demo[id]` directive: a line containing only this text places a component registered in `config.demos` at that position in the Markdown. Multiple occurrences, repeated ids and different ids are supported; each is an independent Angular instance that is server-rendered, hydrated and destroyed on navigation.
- Safe by construction: Doq cuts Analog's already-rendered HTML at top-level directive paragraphs only. Directives in code blocks, inline code, lists, blockquotes, tables or running text stay literal; heading ids, duplicate-heading suffixes, the table of contents, highlighting and search anchors are unchanged. No evaluation, no HTML injection, no template compilation.
- Unknown ids render an accessible `role="status"` notice instead of failing the page. A frontmatter `demo:` that is also placed inline renders once.
- Exports: `splitDoqInlineDemos`, `DOQ_INLINE_DEMO_PATTERN`, `DoqContentSegment`.
- Search: demo markup is `data-pagefind-ignore`; Markdown before and after a demo is indexed.
- `docs/guides/angular-movement-migration.md` and `pnpm verify:adoption`, an opt-in proof against a disposable checkout of the real Angular Movement site (Angular 22, zoneless, Tailwind 4, `SmoothScrollService`).

### Changed
- The document body is wrapped in `.doq-content` (`min-width: 0`); inline demo wrappers are `.doq-region.doq-inline-demo` (block, `overflow-x: auto`). Markdown remains in `.doq-markdown`.
- The copy buttons, heading observation and fragment lookup consider Markdown-rendered nodes only, so markup inside a consumer demo is never decorated or matched by id.

## 0.2.0

Documentation search and navigation. Additive: configuration from 0.1 works unchanged and search is off unless enabled.

### Added
- Optional static full-text search: `search: { enabled, bundlePath }` in `defineDoqConfig()`, a Doq-owned search dialog (native modal `<dialog>`, Ctrl/Cmd+K inside documentation views, keyboard result navigation, loading/empty/unavailable states, plain-text excerpts) and a lazy Pagefind data layer. No backend; the index is requested on the first query.
- `doq-search index <siteDir>` and `@doqs/analog/search-index` (`indexDoqSearch`): build the Pagefind index from the prerendered output. Node-only, not part of the browser entry point. `pagefind` is an optional peer dependency.
- Doq markup is annotated for Pagefind (`data-pagefind-body` on the article, `data-pagefind-ignore` on chrome, demos and slots) so only documentation content is indexed.
- Exports: `normalizeDoqSearchConfig`, `normalizeSearchResultUrl`, `DoqSearchConfig`, `DoqResolvedSearchConfig`, `DoqSearchResult`, `DoqExcerptSegment`.
- `--host-docs-scroll-offset` token (default `2rem`) for heading `scroll-margin-top`.

### Fixed
- Table-of-contents links, direct `#fragment` loads, reloads and client-side fragment navigation now scroll the heading into view after the Markdown renders; Back/Forward restore the reader's scroll position.
- After the mobile drawer, previous/next, search or a card link changes the document, the page starts at the top and keyboard focus moves to the article heading instead of falling back to `<body>`.

### Changed
- The document `<h1>` (and the index `<h1>`) carry `tabindex="-1"` as a programmatic focus target; they are not tab stops.
- The document view gains a `.doq-topbar` wrapper around the breadcrumb (and the search button) and `.doq-region` wrappers (`display: contents`) around demos and slots.
- `@doqs/analog` now ships `bin/` and a `bin` entry.

## 0.1.0

First versioned release. Existing 0.0.0-pilot configuration keeps working.

### Added
- `doqPrerenderRoutes(paths)` — Analog `prerender.routes` entries (index + recursive content route with canonical slug transform) from one `{ contentDirectory, basePath }` object.
- `DoqPaths`, `normalizeDoqPaths()` and `defineDoqConfig()` — one shared, validated, build-safe path contract for Vite and Angular.
- `slots.indexAfterIntro` and `slots.documentAfterContent` — optional host-owned standalone components rendered with `NgComponentOutlet`.
- `presentation` — `documentationLabel`, `indexTitle`, `indexDescription`, `pageTitleSuffix`.
- Scoped page metadata: host title and description are captured (on the server and transferred to the client) and restored on leaving the docs; documents without a description no longer keep the previous document's; unknown docs routes get a `Page not found` title.
- `pnpm verify:package` (tarball and installed-consumer checks) and the `v01` browser check in `pnpm verify:mvp`.

### Changed
- The index and document components share one document catalog (`injectDoqDocuments`) instead of duplicating discovery.
- The docs index now sets the page title (previously left untouched).
- `contentDirectory` and `basePath` are normalized by `provideDoq()`.

### Unchanged
Routing, canonical and custom slugs, navigation order, heading IDs, mobile drawer, TOC, code copy and the demo registry.
