# 0002 — Documentation search and navigation

## Problem

Readers of a Doq site can only find a page by browsing the sidebar. Following a table-of-contents entry changes the URL fragment but does not scroll the heading into view (a documented `test.fail()` in `e2e/toc.spec.ts`), deep links with `#fragment` do not scroll after a reload, and after choosing a page in the mobile drawer keyboard focus falls back to `<body>`.

## Consumer impact

Search is opt-in: a 0.1 consumer that changes nothing keeps its exact markup, bundle and behavior. A consumer that enables it gets a search trigger and dialog inside Doq's documentation views and runs one documented command after prerendering to produce a static [Pagefind](https://pagefind.app) index. No backend, hosted service or credentials are involved.

Fragment scrolling, scroll-to-top after in-app document changes and focus movement to the article heading apply to every consumer with no configuration. The only new visual contract is the optional `--host-docs-scroll-offset` token.

## Scope

- Optional `search` configuration, a lazy Pagefind data layer and a Doq-owned Angular search dialog.
- A Node-only indexing helper shipped as a CLI (`doq-search`) and as the `@getdoq/analog/search-index` entry point, run on the prerendered output.
- Doq markup annotations so only documentation article content is indexed.
- Deterministic fragment scrolling, history behavior, scroll reset and focus management for documentation navigation.
- Search enabled in both showcases and in the tarball consumer.

## Non-goals

No documentation versioning, multilingual search, hosted or AI search, analytics, search-provider plugin system, custom inverted index, router replacement, theme rewrite, npm publication, tag or release.

## Requirements

- **REQ-001** Search is configured through a small typed optional `search` object (`enabled`, `bundlePath`), is off by default, validated by `defineDoqConfig`, and loads nothing when off.
- **REQ-002** `doq-search` builds a full-text Pagefind index from the prerendered static output, indexing only documentation article content (title, description, section headings and body) and excluding host chrome and Doq controls.
- **REQ-003** The search dialog loads the index lazily on first use, searches as the reader types, ignores stale responses, shows loading, empty and unavailable states, and renders result text without raw HTML.
- **REQ-004** The search dialog is a native modal dialog with an accessible name and search input, opens with Cmd/Ctrl+K only inside Doq documentation views, closes with Escape, supports Arrow/Enter keyboard navigation and restores focus.
- **REQ-005** Results link to canonical public routes (custom and nested slugs, any `basePath`, trailing slashes and `index.html` removed) and to section fragments, independent of the bundle location; results outside the Doq base path are dropped.
- **REQ-006** Following a TOC link, loading a URL with a fragment, reloading it, client-side navigation to a fragment and Back/Forward all end with the correct heading at the top of the viewport, respecting `scroll-margin-top`; a missing fragment is harmless.
- **REQ-007** After an in-app change of document (drawer, previous/next, search) the drawer is closed, the new document starts at the top (or at its fragment) and keyboard focus moves to the article heading or fragment target without adding a tab stop; Escape and Close keep returning focus to the trigger.
- **REQ-008** Showcase A, Showcase B and the tarball-installed consumer enable search through the same public API, generate their own index and return search results at the correct routes, including `/docs/onboarding/first-application`.
- **REQ-009** The package is `@getdoq/analog@0.2.0`, ships the CLI and entry point without making Pagefind a dependency, and README, CHANGELOG, CI and verification scripts match the implemented behavior.
- **REQ-010** The MVP and 0.1 acceptance suites, a search-disabled build and every earlier test keep passing.

## Acceptance cases

- **AC-001** [REQ-001] `search` defaults to disabled with bundle path `/pagefind/`; an enabled config normalizes the bundle path; non-boolean `enabled` and empty, traversing or non-http(s) bundle paths are rejected.
- **AC-002** [REQ-001] With search disabled no search button, dialog or request exists in the rendered documentation and the page is unchanged for existing consumers.
- **AC-003** [REQ-002] `indexDoqSearch` produces `pagefind/pagefind.js` and fragments from a prerendered tree, fails with a clear message when the directory or Pagefind is missing, and never runs without an `index.html`.
- **AC-004** [REQ-002] Pagefind finds a phrase that exists only in the Markdown body, and the index contains the documentation pages but not the landing page or other host pages.
- **AC-005** [REQ-002] Sidebar, breadcrumb, TOC, pagination, copy buttons, demos and slots are excluded from the indexed text.
- **AC-006** [REQ-003] Typing issues a search, shows a loading state, then results with titles, section names and excerpts; an unmatched query shows an empty state; a missing bundle shows an unavailable state and does not break the page.
- **AC-007** [REQ-003] A slow earlier query can never replace the results of a later query.
- **AC-008** [REQ-003] Excerpts with markup characters render as text; only `<mark>` is turned into highlighting by Doq itself.
- **AC-009** [REQ-004] Ctrl+K and Cmd+K open the dialog only in documentation views and not from other text inputs; Escape closes and restores focus; ArrowDown/ArrowUp move between results and Enter opens one.
- **AC-010** [REQ-004] The dialog has an accessible name, a labelled search field, an announced status, visible focus and passes an automated accessibility scan.
- **AC-011** [REQ-005] URL normalization handles trailing slashes, `index.html`, absolute origins, fragments and foreign base paths for both `/docs` and a custom `basePath`.
- **AC-012** [REQ-005] Choosing a result opens the canonical document, scrolls to the matching heading and updates the active TOC entry and sidebar link.
- **AC-013** [REQ-006] Clicking a TOC link scrolls its heading into the viewport and keeps the fragment (the former expected-failure test passes without `test.fail`).
- **AC-014** [REQ-006] A direct load and a reload of a URL with a fragment scroll to the heading; Back and Forward restore predictable positions; a nonexistent fragment leaves the page readable without errors.
- **AC-015** [REQ-007] Choosing a document in the mobile drawer closes it and focus lands on the new article heading (left and right drawers); focus is never left on `<body>`.
- **AC-016** [REQ-007] Previous/Next navigation shows the new document from its top with focus on its heading, and Back returns to the earlier document.
- **AC-017** [REQ-007] Escape and the Close button still close the drawer and return focus to the trigger; the hidden drawer is not tabbable.
- **AC-018** [REQ-008] In Showcase A a body-only phrase from a component page finds that page; in Showcase B the same kind of query links to `/docs/onboarding/first-application` and never to `/docs/getting-started`; both work on mobile and in their own themes.
- **AC-019** [REQ-008] The tarball-installed consumer builds, is indexed by the packaged `doq-search` binary, and answers a search in a browser.
- **AC-020** [REQ-008] Generated static output contains search assets with correct HTTP responses, with the documentation pages indexed and the landing page not indexed.
- **AC-021** [REQ-009] The packed tarball declares 0.2.0, ships the CLI, the `./search-index` export and declarations, lists `pagefind` only as an optional peer, and includes no private showcase files.
- **AC-022** [REQ-010] `pnpm verify:mvp`, `pnpm verify:package`, the search-disabled E2E scenario and `pnpm quality:gate` pass.
- **AC-023** [REQ-009] This specification passes `pnpm sdd:check` and its verification table records real results.

## Public API impact

Additive only.

- `DoqConfig.search?: DoqSearchConfig` where `DoqSearchConfig = { enabled?: boolean; bundlePath?: string }` (defaults `false` and `'/pagefind/'`). `bundlePath` is where the Pagefind bundle is served; it is independent of `basePath`.
- Exported pure helpers used by the UI and tests: `normalizeDoqSearchConfig`, `normalizeSearchResultUrl`, `DoqSearchResult`.
- New Node-only entry point `@getdoq/analog/search-index` exporting `indexDoqSearch(options)`, and the `doq-search` binary. Neither is reachable from the browser entry point.
- New optional CSS token `--host-docs-scroll-offset` (default `2rem`) controlling heading `scroll-margin-top`.
- `pagefind` is an optional peer dependency of the package, required only to run the indexer.

## Compatibility

Angular 21.2 / 22, Analog 2.9. Search-disabled builds are unchanged apart from the navigation fixes. SSR/SSG: the search dialog content, the index and `window` are only touched in the browser after the reader opens search. Pagefind 1.5.x (pinned in the workspace at 1.5.2); the indexer needs Node 22.22.3+.
