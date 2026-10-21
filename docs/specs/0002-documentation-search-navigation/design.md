# Design — 0002 documentation search navigation

## Existing implementation

`DoqDocsComponent` renders the sidebar, article, TOC and pagination. TOC links use `routerLink [fragment]`, so only the URL changes; Analog's `provideFileRouter` does not enable `anchorScrolling` and the markdown body renders after the route resolves, so a plain router fragment would find no element anyway. A `NavigationEnd` subscription closes the mobile drawer and refocuses the trigger, which is replaced by the "Loading documentation…" branch when the document signal resets. `doqPrerenderRoutes` already emits one static HTML file per public route (custom slugs included), which is the right input for Pagefind.

## Proposed implementation

**Configuration** (`doq-search.ts`, pure): `DoqSearchConfig`, `normalizeDoqSearchConfig`, wired into `defineDoqConfig`/`provideDoq`. Disabled by default; `bundlePath` defaults to `/pagefind/`.

**Data access** (`doq-search.ts` + `DoqSearchService`): the service imports `<bundlePath>pagefind.js` with a runtime `import(/* @vite-ignore */ …)` on the first search, so nothing is bundled and nothing is requested before interaction. Pagefind does the ranking. Page and section sub-results are mapped to `DoqSearchResult` (title, section, URL, excerpt segments). A `createLatestGate()` ticket guarantees only the newest query publishes results. Failure to load is a typed `unavailable` state.

**URL mapping**: `normalizeSearchResultUrl(url, basePath)` strips origin, `index.html`/`.html` and trailing slashes, keeps the fragment and returns `undefined` for anything outside `basePath`, so the index location and Doq's route base stay independent.

**UI** (`DoqSearchComponent`, `doq-search`): rendered only when enabled, inside the document and index views. A button opens a native `<dialog>` via `showModal()`, which supplies a focus trap, inert background, Escape handling and focus restoration. The input is `type="search"` with a label; results are a list of real links, ArrowDown/Up move focus between the input and links, Enter on the input opens the first result, and a `role="status"` region announces loading, counts, empty and unavailable states. Excerpts are split into text and `<mark>` segments and rendered through Angular bindings, never `innerHTML`. Cmd/Ctrl+K is a document keydown listener that exists only while a Doq view is mounted and ignores events from other editable fields. The kbd hint is set after first render so SSR and hydration agree.

**Indexing** (`search-index.mjs`, Node only, outside the Angular bundle): `indexDoqSearch({ siteDir, outputDir })` resolves `pagefind` from the consumer, indexes `siteDir` with the Pagefind Node API and writes `<siteDir>/pagefind`. The `doq-search` bin wraps it. It ships as a plain ESM asset exposed as `./search-index`, so `ng-packagr` leaves the browser entry untouched. `pagefind` is an optional peer dependency.

**Index scope**: the article carries `data-pagefind-body`; because at least one element has it, Pagefind skips every page without it (landing, host pages). The breadcrumb, TOC, pagination, copy buttons, demos and slots carry `data-pagefind-ignore`, the h1 is the title and each heading's `id` becomes a section anchor.

**Navigation** (`DoqDocsComponent`): a single "arrival" step runs after the Markdown DOM exists (the existing mutation-observer path). It scrolls to the fragment target (`[id]` inside `.doq-markdown`) with `scrollIntoView`, which honors CSS `scroll-margin-top` (`--host-docs-scroll-offset`). A fragment signal re-runs it for same-document TOC clicks, so there are no timers and no second scroll mechanism. For an in-app (`imperative`) change of document it resets scroll to the top when there is no fragment, then focuses the fragment target or the `h1` (`tabindex="-1"`, `preventScroll`). Popstate navigations leave position to the browser/fragment logic. Closing the drawer by Escape/Close/trigger keeps focus on the trigger; route navigation moves focus to the destination instead.

## Tradeoffs and alternatives

- **Router `anchorScrolling`** would require every host to change `provideRouter` options and still races with async Markdown rendering; rejected for a library.
- **Own inverted index or bundling Markdown** would ship the corpus to the browser and duplicate Pagefind; rejected.
- **Pagefind default UI** does not inherit Doq tokens and injects HTML; rejected.
- **Non-modal panel** vs native modal `<dialog>`: the platform dialog gives correct modal semantics for free, so a custom focus trap is avoided.
- **Result links as ARIA options** in a combobox would hide real links; plain links with managed focus keep native semantics, middle-click and Enter behavior.
- **Core dependency on `pagefind`**: rejected; an optional peer keeps the Angular runtime free of build tooling.
