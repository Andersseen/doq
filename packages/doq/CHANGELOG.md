# Changelog

## 0.6.0

Versioned documentation. Additive and opt-in: a 0.5 configuration (no `versioning`) produces the same routes, the same markup, the same search calls and the same prerendered files as before; this is verified with a 0.5-style consumer built from the packed tarball.

### Added
- **`versioning` in `DoqPaths`/`DoqConfig`**: `{ current: { id, label }, archives: [{ id, label, contentDirectory }], pathSegment?, canonicalOrigin? }`. The top-level `contentDirectory` stays the current version at its existing URLs; every archive is an independent catalog in its own folder, mounted at `<basePath>/<pathSegment>/<id>` (`/docs/v/1.3`, or `/v/1.3` for a docs-first site). Validated with one-line diagnostics: id syntax, duplicates (case-insensitive), overlapping or unsafe content directories, the reserved URL segment, empty archives and origins.
- **Routing**: `doqRoutes()` adds an index and a document route per archive (before the current routes), never lets the current routes capture the reserved prefix, and sends unknown versions to the not-found view. Route data carries the version; no second router.
- **Prerendering**: `doqPrerenderRoutes()` returns an index and a content route for every version, with the same slug rules; the reserved prefix is rejected for current documents.
- **Catalogs**: `injectDoqDocuments(config, versionId?)` reads only that version's folder; sidebar, index cards, breadcrumbs, previous/next and counts follow the active version. Content is resolved by version and public slug (Analog's slug-keyed content map), so equal slugs in two versions never load each other's Markdown.
- **`DoqVersionSwitcherComponent`** and `doqVersionLinks()`: native `<details>` selector of real links in the sidebar/drawer (top bar when the sidebar is hidden, and on index pages); `aria-current`, current/archived labels, Escape returns focus; switching keeps the public slug or opens the target version's index; archived pages show a notice.
- **Search**: indexed pages carry `data-pagefind-filter="doqsVersion:<id>"`; the dialog filters at Pagefind search time with the version being read and reports a version that was never indexed. Unversioned sites use no filter.
- **SEO**: archive titles end with the version label; optional `canonicalOrigin` makes each page declare its own canonical URL (a host-authored canonical link is never replaced, Doqs's link is removed with the last Doqs page). No origin is hard-coded.
- **API reference**: no generator change was needed; `--content-dir`, `--out` and `--base-path` already produce independent archived references with independent manifests (verified, including that regenerating the current reference cannot touch an archive).
- Showcase A (embedded `/docs`, archive `v1.x` with its own generated reference), Showcase B (docs-first, archive `1.x`) and the Angular Movement adoption proof (archive built from the real upstream tag `v0.9.0`) exercise the same public API.

### Changed
- `normalizeDoqPaths()` additionally returns the resolved `versioning` when configured. New exports: `DOQ_VERSION_FILTER`, `doqVersionLinks`, `DoqVersionSwitcherComponent` and the version types.
- `DoqSearchService.search()` takes an optional `versionId` (fourth parameter) and rejects with `DoqVersionNotIndexedError` when the index has no such version.
- CSS: new selectors `.doq-version*` and `.doq-version-notice`; no token was added or changed.

### Fixed
- `scripts/preview-static.ts` crashed on a directory without `index.html` (such as the bare `/docs/v` prefix) because it had already sent a 200 header when reading failed; it now answers 404.

### Compatibility and limits
- Node and peer ranges unchanged; no new dependency. Frontmatter of all versions is in the browser bundle (Analog's content list), bodies load lazily per page.
- Not included: localization, automatic snapshots, remote content, per-version themes, semantic API diffing.

## 0.5.0

Angular API reference generation. Additive and opt-in: nothing changes for a project that does not run `doq-api`; no configuration option, route, frontmatter key read by the runtime or CSS token was added or changed, and the Angular entry point imports neither Node nor TypeScript.

### Added
- **`doq-api generate` / `doq-api check`** (Node-only CLI) and **`@doqs/analog/api-reference`** (`generateApiReference`, `checkApiReference`, `buildApiReference`, `DoqApiError`, typed in `api-reference.d.mts`). They read a library's public entry point with the project's own TypeScript (optional peer `^5.5.0 || ^6.0.0`, resolved from the project, never bundled) and write deterministic Doqs Markdown: an index plus one page per public symbol, as tables and fenced code, with frontmatter (`title`, `description`, `group`, `order`, `generated`, `category`).
- **Angular-aware extraction**: components, directives, pipes and services (selector, `exportAs`, pipe name, `providedIn`); signal `input()` / `input.required()` with aliases, defaults, transforms and both the accepted and the read type; `model()` with its change output; `output()`; legacy `@Input()` / `@Output()` with `EventEmitter`; public methods and properties. Computed metadata is reported, never guessed.
- **TypeScript extraction**: functions with overloads, arrow-function constants, interfaces, type aliases, enums, classes, constants; readable signatures (generics, optional/rest parameters, unions, readonly arrays) without absolute paths; links to other documented symbols; JSDoc (`@param`, `@returns`, `@example`, `@deprecated`, `@since`, `@see`, `@stability`, `@experimental`, `{@link}`) with HTML and Doqs directives neutralised.
- **Safe ownership**: output only inside a sub-directory of the content directory, a `.doq-api.json` manifest with file hashes, no overwrite of hand-written or hand-edited files, removal only of unchanged generated files, nothing written when a conflict exists.
- **Check mode**: exits 1 and names added, modified and removed pages when the committed reference is stale; never writes. Exit code 2 marks usage and configuration errors. `--strict` fails on warnings and undocumented symbols.
- Options: `--entry`, `--project`, `--out`, `--content-dir`, `--base-path`, `--group`, `--title`, `--order-start`, `--source-url`, `--include`, `--exclude`, `--strict`, `--cwd`.
- Showcase A documents a standalone Angular component and directive (`apps/showcase-a/vanta-ui`); Showcase B documents a non-Angular SDK (`apps/showcase-b/forge-sdk`); both commit their generated pages and check them in `pnpm verify:change` / CI (`pnpm api:check`). The disposable Angular Movement proof generates and verifies the reference of its real public API.

### Fixed
- A long unbroken title (a generated API page named `VantaAlertComponent`) overflowed a 375 px viewport on Linux fonts; document and index titles now wrap anywhere (`overflow-wrap`).
- Release workflow: `verify-published` waited two minutes for npm to list a fresh version, but the registry took about six minutes to list `@doqs/analog@0.4.0` (published 09:51 UTC, visible 09:57 UTC on 2026-10-22), so the GitHub Release `v0.4.0` was not created. The window is now ten minutes or more (`PUBLISH_VISIBILITY`, regression test `UNIT-100`). The missing `v0.4.0` release is not created retroactively; see `docs/operations/release-and-deployment.md`.

### Compatibility and limits
- Node `^20.19.0 || ^22.12.0 || >=24.0.0`; tested with TypeScript 5.9 (this repository) and 6.0 (Angular Movement). No Angular peer range was widened.
- Links inside Markdown are ordinary anchors (Analog does not intercept them), so following a reference link is a normal navigation to a prerendered page.
- Not included: a TypeDoc replacement, API versioning, template analysis, runtime reflection, a browser-side analyser.

## 0.4.0

Rich documentation authoring. Additive: every 0.3 configuration, document, route and `::demo[id]` directive works unchanged, and a document without rich blocks renders as one Markdown region exactly as before. No configuration option was added; the blocks are always on and only recognise the exact syntax below.

### Added
- **Callouts**: GitHub-style alerts, `> [!NOTE]`, `TIP`, `IMPORTANT`, `WARNING` and `CAUTION` (case-insensitive, marker alone on the first line of a blockquote). They render as `div.doq-callout[role="note"]` with a visible title and a distinct glyph per kind, so meaning never depends on colour alone, and work at any nesting depth (including inside steps and tabs). Ordinary blockquotes, unknown markers (`[!DANGER]`) and markers in code stay as written.
- **Tabs**: `:::tabs [label]`, `:::tab Label` per tab, `:::` to close. WAI-ARIA tabs (`tablist` / `tab` / `tabpanel`, `aria-selected`, `aria-controls` / `aria-labelledby`, roving tabindex) with Arrow, Home and End keys. Every panel is in the prerendered HTML (inactive ones `hidden`); each group keeps its own selection and ids are stable between server and browser. A group whose tabs only contain code renders as a **code group** with flush code panels, using the same component.
- **Steps**: `:::steps` around an ordered list renders a native `<ol>` with a rail and styled markers (`::marker`, no custom counters), so numbering stays real list semantics. Nested code, links and callouts work.
- **Code presentation**: a visible language label on every fenced block (`data-language`, drawn by CSS so it is not searchable text) and `:::code file.ts` before a fence for a titled block (`figure.doq-code` + `figcaption`). The copy button copies the block's exact text.
- **Search policy**: callout bodies, steps, titled code and the content of inactive tab panels are indexed; the tab strip and callout titles are `data-pagefind-ignore`.
- **CSS tokens** (optional, all with defaults): `--host-docs-callout-note`, `-tip`, `-important`, `-warning`, `-caution`.
- Exports: `parseDoqContent`, `DOQ_CALLOUT_TYPES`, `DoqRichSegment`, `DoqTab`, `DoqCalloutType`, `DoqTabsComponent`.
- A fragment that points at a heading inside an inactive tab activates that tab before scrolling.
- `basePath: '/'` mounts the documentation at the application root, for sites that are documentation only. The index is served at `/` and documents at `/<slug>`; `doqRoutes`, `doqPrerenderRoutes`, document routes, pagination and search result URLs all honour it. `basePath: ''` is still rejected.
- Export `joinDoqPath(basePath, slug)`, the single place that builds public document URLs.

### Changed
- Markdown lists inside `.doq-markdown` now restore `list-style` (`disc` / `decimal`) and a left padding, so a host reset such as Tailwind's preflight no longer removes bullets and numbers.
- The copy button reads `textContent` of the code element (identical text in browsers, and testable without layout).

### Fixed
- Release workflow: `npm publish artifacts/<file>.tgz` was parsed by npm 11 as a GitHub repository spec and failed before publishing. The tarball is now passed as an absolute path by `scripts/release/cli.ts publish` (regression test `UNIT-070`). The 0.3.0 publication never reached npm; see `docs/operations/release-and-deployment.md`.

### Compatibility and limits
- Directive lines (`:::...`) must be paragraphs of their own: put a blank line (or a code fence) before and after them. Text glued to a marker, an unclosed group, a `:::tab` outside `:::tabs`, nested `:::tabs`, or a steps group without an ordered list leave the original text on the page; nothing is dropped.
- `::demo[id]` is recognised at the top level of the article, not inside a tab or step. `:::code` titles apply at the top level, in tabs and in steps' top-level paragraphs, not inside a list item.
- Fence metadata (`ts title="x"`) is dropped by Analog before Doqs sees the HTML, which is why a title is a `:::code` line rather than part of the fence.

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
