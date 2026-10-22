# @doqs/analog

Documentation that lives inside your Angular/[Analog](https://analogjs.org) app. Doq adds a Markdown-driven documentation region — routing, sidebar, table of contents, index, code blocks — and leaves your header, footer, routes, theme and components to you.

Version **0.3.0**. Published on npm as [`@doqs/analog`](https://www.npmjs.com/package/@doqs/analog).

## What Analog requires vs. what Doq adds

| Step | Required by | Notes |
| --- | --- | --- |
| `provideFileRouter()`, `provideContent(withMarkdownRenderer())` | Analog | Doq does not replace or configure them. |
| `prerender` routes in `vite.config.ts` | Analog | Doq supplies `doqPrerenderRoutes()` to generate them. |
| `prismjs` and the Analog content peers | Analog | `@analogjs/content`, `@analogjs/router` and `prismjs` stay your dependencies. |
| `doqRoutes()`, `provideDoq()`, `defineDoqConfig()` | Doq | Docs routing and configuration. |
| `@import '@doqs/analog/styles.css'` | Doq | Once, in your global stylesheet. |

## Quick start

```sh
pnpm add @doqs/analog @analogjs/content @analogjs/router prismjs
```

```css
/* src/styles.css */
@import '@doqs/analog/styles.css';
```

**1. Share the paths once.** This module is imported by `vite.config.ts`, so keep it free of Angular components.

```ts
// src/doq.paths.ts
export const doqPaths = { contentDirectory: 'docs', basePath: '/docs' } as const;
```

**2. Prerender with Analog.**

```ts
// vite.config.ts
import { doqPrerenderRoutes } from '@doqs/analog';
import { doqPaths } from './src/doq.paths';

analog({
  ssr: true,
  static: true,
  content: { highlighter: 'prism' },
  prerender: { routes: async () => ['/', ...doqPrerenderRoutes(doqPaths)] },
});
```

`doqPrerenderRoutes()` returns the documentation index route plus a recursive `src/content/<contentDirectory>` entry whose `transform` applies Doq's canonical URL rule (nested folders, `index.md`, custom `slug`, custom `basePath`). It does not import `@analogjs/platform`.

**3. Configure Angular.** Runtime-only things (demos, slots) belong here, not in the paths module.

```ts
// src/app/app.config.ts
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { provideFileRouter, withExtraRoutes } from '@analogjs/router';
import { defineDoqConfig, doqRoutes, provideDoq } from '@doqs/analog';
import { doqPaths } from '../doq.paths';

const doqConfig = defineDoqConfig({
  ...doqPaths,
  sidebar: 'left',
  showTableOfContents: true,
  demos: { 'product-button': ProductButtonDemoComponent },
  slots: { indexAfterIntro: GettingStartedCallout, documentAfterContent: HelpLinks },
  presentation: {
    indexTitle: 'Build with Acme',
    indexDescription: 'Guides and references for the Acme platform.',
    pageTitleSuffix: 'Acme',
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideFileRouter(withExtraRoutes(doqRoutes(doqConfig))),
    provideContent(withMarkdownRenderer()),
    provideDoq(doqConfig),
  ],
};
```

**4. Write Markdown** in `src/content/docs`:

```markdown
---
title: Button
description: Optional. Used for the page and the meta description.
group: Components   # sidebar section; defaults to the folder
order: 2            # default 100
slug: ui/button     # optional; replaces the whole path below basePath
demo: product-button
---

## Usage
```

Without `slug`, `src/content/docs/guides/setup.md` is served at `/docs/guides/setup`. Slug segments accept letters, numbers, `_`, `-` and `~`; invalid slugs and duplicate public routes throw a diagnostic naming the files.

## Configuration

`defineDoqConfig()` validates and normalizes the config (`contentDirectory: '/docs/'` → `'docs'`, `basePath: 'help'` → `'/help'`) and throws on an empty or `..` directory or an empty `basePath`. `provideDoq()` applies it too, so passing a plain object still works.

| Option | Default | Purpose |
| --- | --- | --- |
| `contentDirectory` | required | Folder below `src/content`. |
| `basePath` | `'/docs'` | Public mount path. Use `'/'` when the whole application is documentation (see below). |
| `routeParam` | `'slug'` | Router parameter name (use the same config for `doqRoutes` and `provideDoq`). |
| `contentWidth` | `'46rem'` | Article width, any CSS length. |
| `sidebar` | `'left'` | `'left'`, `'right'` or `'hidden'`. |
| `sidebarWidth` | `'16rem'` | Sidebar width. |
| `showTableOfContents` | `true` | The “On this page” index. |
| `demos` | none | Registry of host components by ID, used by `demo:` frontmatter and `::demo[id]` in Markdown. |
| `slots` | none | Host-owned components at two stable locations. |
| `presentation` | none | Product-specific copy and title suffix. |
| `search` | disabled | Optional static full-text search, see [Search](#search). |

### Presentation

| Field | Default | Used for |
| --- | --- | --- |
| `documentationLabel` | `'Documentation'` (breadcrumb root `'Docs'`) | Index eyebrow, navigation label, mobile menu button, breadcrumb root when set. |
| `indexTitle` | `'Explore the docs'` | Index `<h1>` and page title. |
| `indexDescription` | `'Browse guides and references for this product.'` | Index intro and meta description. |
| `pageTitleSuffix` | `'Documentation'` | Document titles: `Button · Acme`. `''` removes the suffix. |

Titles and descriptions are scoped: Doq captures your page's own title and description when a docs page opens and restores them when you navigate away; a document without a `description` shows your host description instead of the previous document's. An unknown docs URL gets `Page not found · <suffix>`.

### Demos, slots, CSS tokens and the shell

- **Demos** (`demos`) are host components registered by ID. A `demo:` frontmatter ID appends one to the end of *one document*; a `::demo[id]` line places one anywhere in the Markdown ([below](#interactive-components-in-markdown)). Unknown IDs render an accessible fallback.
- **Slots** (`slots`) add the *same* host component to *every* page of a kind: `indexAfterIntro` renders between the index introduction and the document cards; `documentAfterContent` renders after the Markdown content and demo of each document. They are created with `NgComponentOutlet`, receive no inputs (inject host services instead), need no wrapper or selectors, and have no effect when omitted. They are standalone Angular components owned by your app; Doq never imports them.
- **CSS tokens** restyle Doq without code. Set these on an ancestor of the docs: `--host-docs-background`, `--host-docs-foreground`, `--host-docs-primary`, `--host-docs-secondary`, `--host-docs-muted`, `--host-docs-border`, `--host-docs-surface`, `--host-docs-focus`, `--host-docs-code-background`, `--host-docs-code-foreground`. Doq sets no global `html`/`body` styles. Slots can use the same tokens.
- **`DoqShellComponent`** is an optional neutral page shell for projects without one. Existing applications do not need it.

## Interactive components in Markdown

Register standalone Angular components once in `demos`, then place them between Markdown blocks:

```ts
const doqConfig = defineDoqConfig({
  ...doqPaths,
  demos: { 'install-command': InstallCommandComponent, 'enter-animation': EnterAnimationComponent },
});
```

```markdown
## Installation

Pick a package manager:

::demo[install-command]

## Try it

::demo[enter-animation]
```

**Syntax.** One line containing only `::demo[id]`, separated from neighbouring text by blank lines. The id uses letters, digits, `_` and `-` and must start with a letter or digit. There is no other form.

**How it is parsed.** Analog renders Markdown to HTML at build time (`content: { highlighter: 'prism' | 'shiki' }` must be set in `analog()`, as in the Quick start). Doq then cuts that finished HTML at paragraphs that are exactly a directive and renders the pieces with `NgComponentOutlet`, so heading ids, duplicate-heading suffixes, syntax highlighting, the table of contents and copy buttons are exactly what they are without demos. Nothing is rewritten, evaluated or compiled; the directive only *names* a component your app registered.

**What does not count as a directive** (it stays literal text): a directive in a fenced or indented code block, in inline code, inside a list item, blockquote or table, or inside other text (`see ::demo[x]`), and anything whose id does not match the pattern.

**Behavior.**
- The same id can appear several times; each occurrence is its own instance with its own state.
- An unregistered id renders `Demo “id” is not registered by this application.` (`role="status"`) and the page keeps working.
- A frontmatter `demo: id` that is also placed inline renders once, where the directive is. A frontmatter demo no directive uses still renders after the content, and `slots.documentAfterContent` is unchanged.
- Components are created without inputs (inject host services), live in the Angular tree (signals, OnPush, zoneless, DI), are server-rendered and hydrated, and are destroyed on navigation. Revisiting a page starts from fresh instances.
- Search: demos are wrapped in `data-pagefind-ignore`, so their controls are never indexed; the Markdown before and after them is. Copy buttons are added to Markdown code only, never to markup inside a demo.
- Styling: Doq adds only a block wrapper (`.doq-inline-demo`, margin and horizontal overflow containment). Your component brings its own styles; use the `--host-docs-*` tokens if it should follow the docs theme.
- Public helpers `splitDoqInlineDemos()` and `DOQ_INLINE_DEMO_PATTERN` are exported for tooling and tests.

Building a documentation-only site (Starlight or ngDoc style)? Set `basePath: '/'` in the shared paths: the documentation index is served at `/`, documents at `/<slug>` and the application has no other routes (do not add `pages/index.page.ts`). `DoqShellComponent` provides a neutral header and footer (`docsPath="/"`). Showcase B in this repository is that scenario; Showcase A mounts Doqs on a single `/docs` route of a product site.

Moving documentation gradually? Mount Doq under another `basePath` (for example `/handbook`) while existing routes keep serving `/docs`; see [docs/guides/angular-movement-migration.md](../../docs/guides/angular-movement-migration.md).

## Search

Doq can add fast full-text search that needs no backend, hosted service or credentials. It uses [Pagefind](https://pagefind.app): a static index is generated from your prerendered HTML after the build, and the browser downloads only the index pieces a query needs. Search is **off by default**; an app that does nothing keeps its 0.1 markup, requests and behavior.

**1. Enable it.**

```ts
const doqConfig = defineDoqConfig({
  ...doqPaths,
  search: { enabled: true }, // bundlePath defaults to '/pagefind/'
});
```

| Option | Default | Purpose |
| --- | --- | --- |
| `search.enabled` | `false` | Shows the search button (and Ctrl/Cmd+K) inside Doq documentation views. |
| `search.bundlePath` | `'/pagefind/'` | Where the generated bundle is served: an absolute path or `http(s)` URL. It is independent of `basePath`. |

Invalid values (a non-boolean `enabled`, or a relative, `..`, `javascript:` or query-string `bundlePath`) throw from `defineDoqConfig()`.

**2. Generate the index after prerendering.** Install Pagefind as a dev dependency (it is an *optional* peer dependency of Doq and never part of the Angular bundle) and run the packaged command on the static output:

```sh
pnpm add -D pagefind
```

```jsonc
// package.json
"scripts": { "build": "vite build && doq-search index dist/analog/public" }
```

`doq-search index <siteDir> [--output <dir>]` writes `<siteDir>/pagefind` (default). It removes any previous bundle, indexes only elements Doq marks with `data-pagefind-body` (the article: title, description, section headings and Markdown body) and fails with a clear message when the site has not been prerendered, has no documentation pages or Pagefind is missing. Your landing page, header, footer, sidebar, table of contents, pagination, copy buttons, demos and slots are not indexed. The same function is available to Node scripts as `import { indexDoqSearch } from '@doqs/analog/search-index'` (Node only, never import it in browser code).

**What readers get.** A *Search* button next to the breadcrumb opens a native modal dialog, also opened with Ctrl+K / ⌘K only while a Doq documentation view is shown and never while another text field has focus. The index is loaded the first time the reader types. Results show the page title, the matching section and a highlighted excerpt rendered as plain text, link to the canonical public URL (custom and nested slugs included, never the source filename) and open the section heading. ArrowDown/ArrowUp move between results, Enter opens one, Escape closes. Loading, empty and "search unavailable" (index missing) states are announced in a status region; a missing index never breaks the page (this is also what you see under `vite dev`, which does not serve a generated index; run the build once or preview the static output to try search).

The dialog uses the same `--host-docs-*` tokens as the rest of Doq, so it follows your theme. Static hosting must serve `bundlePath` (the `.pagefind`, `.pf_*` and `.js` files) with any content type; Pagefind needs no special headers.

**Cost.** The library adds a few kilobytes (about 6 KB gzip for the new search and navigation code in the unminified package). Pagefind itself is not bundled: `pagefind.js` (~13 KB gzip), the worker, a WebAssembly module (~70 KB) and the index fragments are fetched on the first query only.

## Navigation and reading

These behaviors need no configuration:

- **Fragment links work.** Following a table-of-contents link, opening or reloading a URL with `#heading`, and client-side navigation to a fragment scroll the heading into view once the Markdown has rendered. A fragment that matches no heading is ignored. Back/Forward restore the reader's position. Headings keep the renderer's IDs (`examples`, `examples-1` for duplicates).
- **Sticky host headers.** Headings use `scroll-margin-top: var(--host-docs-scroll-offset, 2rem)`. Set `--host-docs-scroll-offset` (any CSS length) to the height of your sticky header.
- **Continuity.** After an in-app change of document (sidebar, mobile drawer, previous/next, search) the new document starts at the top and keyboard focus moves to the article heading (`tabindex="-1"`, no extra tab stop), or to the heading named by the fragment. Escape and the Close button still return focus to the menu button. Direct loads never move focus.

Doq does not change your router configuration; it does not need `withInMemoryScrolling`.

## Public API

`defineDoqConfig`, `provideDoq`, `doqRoutes`, `doqPrerenderRoutes`, `doqPrerenderRoute` (single file, kept for compatibility), `splitDoqInlineDemos`, `DOQ_INLINE_DEMO_PATTERN`, `normalizeDoqPaths`, `joinDoqPath`, `normalizeDoqSearchConfig`, `normalizeSearchResultUrl`, the types `DoqConfig`, `DoqPaths`, `DoqSlots`, `DoqPresentation`, `DoqContentSegment`, `DoqSearchConfig`, `DoqSearchResult`, `DoqDemoRegistry`, `DoqPrerenderContentRoute`, the document helpers, and the components `DoqDocsComponent`, `DoqIndexComponent`, `DoqShellComponent`. Node-only: `@doqs/analog/search-index` (`indexDoqSearch`) and the `doq-search` binary. Styles: `@doqs/analog/styles.css`; new optional token `--host-docs-scroll-offset`.

## Compatibility

Built with Angular 21.2 and Analog 2.9. Angular 22 is in the peer range but not validated. Existing 0.0.0-pilot and 0.1 configuration objects keep working without changes; search is opt-in. Pagefind 1.5.x is supported (optional peer `^1.5.0`). See [CHANGELOG.md](./CHANGELOG.md).
