<div align="center">

<img src="https://raw.githubusercontent.com/Andersseen/doqs/main/docs/assets/readme-banner.svg" alt="Doqs — Documentation that belongs in your app" width="100%" />

# @doqs/analog

**Documentation that lives inside your Angular and [Analog](https://analogjs.org) app.** A Markdown-driven documentation region — routing, sidebar, table of contents, index, code blocks, optional static search and live Angular components via `::demo[id]` — while your header, footer, routes, theme and components stay yours.

[![npm](https://img.shields.io/npm/v/@doqs/analog?style=flat-square&logo=npm&label=npm&color=B83410)](https://www.npmjs.com/package/@doqs/analog)
[![License: MIT](https://img.shields.io/badge/license-MIT-22C55E?style=flat-square)](https://github.com/Andersseen/doqs/blob/main/LICENSE)
[![Repository](https://img.shields.io/badge/GitHub-Andersseen%2Fdoqs-181717?style=flat-square&logo=github)](https://github.com/Andersseen/doqs)

</div>

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
| `versioning` | none | Optional archived documentation versions, see [Versioned documentation](#versioned-documentation-06). |

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
- **CSS tokens** restyle Doq without code. Set these on an ancestor of the docs: `--host-docs-background`, `--host-docs-foreground`, `--host-docs-primary`, `--host-docs-secondary`, `--host-docs-muted`, `--host-docs-border`, `--host-docs-surface`, `--host-docs-focus`, `--host-docs-code-background`, `--host-docs-code-foreground`, and (0.4) `--host-docs-callout-note`, `-tip`, `-important`, `-warning`, `-caution`. Doq sets no global `html`/`body` styles. Slots can use the same tokens.
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
## Rich Markdown authoring

Doq 0.4 adds the content patterns documentation keeps repeating, written in plain Markdown. They are built into Doq (no registration, no Angular component to write), accessible, server-rendered and searchable. Consumer Angular components stay what `::demo[id]` is for.

### Callouts

```markdown
> [!NOTE]
> This feature needs Angular 21 or later. Lists, [links](/docs/x) and `inline code` work inside.

> [!WARNING]
> Avoid browser-only APIs during server rendering.
```

Kinds: `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION` (case-insensitive; the marker must be alone on the first line). Each renders as `<div class="doq-callout" data-callout="warning" role="note">` with a visible title and a different glyph per kind. Ordinary blockquotes, unknown markers such as `[!DANGER]`, and markers inside code are left as written.

### Tabs and code groups

````markdown
:::tabs Package manager

:::tab npm

```bash
npm install @doqs/analog
```

:::tab pnpm

```bash
pnpm add @doqs/analog
```

:::
````

Tabs contain any Markdown (paragraphs, lists, callouts, steps, code). A group whose tabs contain only code is a *code group*: the same tabs, with flush code panels, so one keyboard system serves both. The optional text after `:::tabs` names the tab list for assistive technology. Arrow keys move and activate, Home and End jump; each group keeps its own selection (nothing is stored globally). All panels are in the static HTML, so the content is available without JavaScript and is indexed.

### Steps

```markdown
:::steps

1. **Install** the package.

   ```bash
   pnpm add @doqs/analog
   ```

2. **Register** the routes. Callouts and links can go inside a step.

:::
```

The ordered list stays a native `<ol>` (the number is real list semantics, styled through `::marker`).

### Titled code and language labels

````markdown
:::code app.config.ts

```ts
export const appConfig = { providers: [provideDoq(doqConfig)] };
```
````

Every fenced block shows its language; `:::code <title>` immediately before a fence adds a caption (a `figure` with a `figcaption`). Analog drops fence metadata before Doq sees the HTML, so titles use this line instead of an info string.

### Rules, limits and compatibility

- Directive lines (`:::tabs`, `:::tab …`, `:::steps`, `:::code …`, `:::`) are paragraphs of their own: leave a blank line (or a code fence) around them. If a group does not parse exactly (unclosed, text glued to a marker, `:::tab` outside `:::tabs`, nested `:::tabs`, no ordered list in `:::steps`) the author's text stays on the page.
- `::demo[id]` works at the top level of an article, around callouts, tabs and steps, but not inside a tab or step. `:::code` titles do not apply inside a list item.
- Nothing is evaluated and no template is compiled; blocks are cut and wrapped from Analog's rendered HTML, so heading ids, duplicate suffixes, the table of contents and highlighting are unchanged.
- **Search policy.** Callout bodies, steps, code and the content of inactive tab panels are indexed; tab labels and callout titles are not (`data-pagefind-ignore`). A result for text in an inactive tab opens the page; a fragment pointing at a heading inside an inactive tab activates that tab.
- **Theming.** Rich blocks use the existing tokens plus optional `--host-docs-callout-note`, `-tip`, `-important`, `-warning`, `-caution`.
- **Migrating from 0.3.** Nothing to change. Markdown lists in `.doq-markdown` now restore bullets and numbers even under a CSS reset such as Tailwind's preflight.

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

## API reference from source (0.5)

Doqs can write the *reference* part of your documentation for you. `doq-api` reads the public TypeScript API of your library with **your** compiler and writes ordinary Doqs Markdown pages (an index plus one page per public symbol). The pages go through the same routing, table of contents, highlighting, theming and Pagefind index as the guides you write by hand, so there is no second renderer, no second search and no TypeScript in the browser. You keep owning narrative guides and live demos; the generator owns only the folder you point it at.

```sh
pnpm add -D typescript          # the compiler your project already builds with (optional peer, ^5.5 or ^6)
pnpm exec doq-api generate \
  --project projects/lib/tsconfig.lib.json \
  --entry projects/lib/src/public-api.ts \
  --out src/content/docs/reference/generated \
  --base-path /docs
pnpm exec doq-api check <same flags>   # CI: exit 1 when the committed pages are stale
```

```jsonc
// package.json
"scripts": {
  "api": "doq-api generate --project projects/lib/tsconfig.lib.json --entry projects/lib/src/public-api.ts",
  "api:check": "doq-api check --project projects/lib/tsconfig.lib.json --entry projects/lib/src/public-api.ts"
}
```

Run `api` when the public API changes and commit the pages; run `api:check` in CI so a pull request that changes the API without refreshing the reference fails. Generation is deterministic (stable order, names and bytes; no timestamps or absolute paths), so a clean check means the pages match the source.

| Flag | Default | Purpose |
| --- | --- | --- |
| `--entry` | required | Public entry point (`public-api.ts`). Only what it exports is documented. |
| `--project` | built-in options | tsconfig used to resolve imports and path aliases. |
| `--out` | `src/content/docs/reference/generated` | Output directory; must be a sub-directory of the content directory. |
| `--content-dir` | `src/content/docs` | Your Doqs content directory (`src/content/<contentDirectory>`). |
| `--base-path` | `/docs` | Your Doqs `basePath`, used for cross-links (`/` for docs-first sites). |
| `--group`, `--title` | `API reference` | Sidebar group of the pages and title of the index page. |
| `--order-start` | `1000` | `order` of the index; symbols follow, so generated pages come after hand-written ones. |
| `--source-url` | none | Adds a source link per symbol; `{path}` and `{line}` are replaced, for example `https://github.com/you/lib/blob/main/{path}#L{line}`. |
| `--include`, `--exclude` | all | Categories: `component,directive,pipe,service,function,class,interface,type,enum,constant`. |
| `--strict` | off | Fail on warnings and on public symbols without a documentation comment. |
| `--cwd` | `.` | Project root. |

Exit codes: `0` success (for `check`: up to date), `1` failed run, stale pages, conflicts or strict violations, `2` usage or configuration error. Node code can use `import { generateApiReference, checkApiReference, buildApiReference } from '@doqs/analog/api-reference'` (Node only, never import it in browser code; typed in `api-reference.d.mts`).

### What is extracted

- **Public API only.** The entry point's exports, followed through barrels, `export *`, renamed and `export type` re-exports. A symbol exported under two names is documented once ("Also exported as"). Unexported code, `@internal`/`@ignore` symbols, re-exports from other packages, `default` and namespaces are skipped, as are private, protected, `#private` and `@internal` members, lifecycle hooks and `inject()`/`viewChild()` fields.
- **Angular.** `@Component`, `@Directive`, `@Pipe` and `@Injectable` (only when the decorator comes from `@angular/core`): selector, `exportAs`, pipe name, `providedIn`, **signal inputs** (`input()`, `input.required()`, aliases, defaults, transforms), **models** (`model()`, with the `<name>Change` output), **outputs** (`output()`), the legacy `@Input()` / `@Output()` forms with `EventEmitter`, and public methods and properties. An input with a `transform` accepts a different binding type than the signal reads (`input<number | undefined, unknown>(…, { transform })` accepts `unknown` and reads `number | undefined`): the page shows the accepted type, the transform and the read type, never `InputSignal<…>`.
- **TypeScript.** Functions (every overload), arrow-function constants, interfaces, type aliases, enums, classes and constants, with generics, optional and rest parameters, unions and readonly arrays as you wrote them. Types are not expanded recursively; a type that is one documented name links to its page and every documented name a signature mentions is listed under *Related types*.
- **JSDoc.** Description, `@param`, `@returns`, `@example`, `@deprecated`, `@since`, `@see`, `@stability`, `@experimental` and `{@link}`. Missing comments still give a signature page; nothing is classed as stable unless you wrote `@stability stable`. Prose cannot add HTML or Doqs directives to a page.

Metadata that is computed (a selector built from a function call, for example) is **reported as a warning and left out**; code is never executed and nothing is guessed. Warnings print to stderr and fail `--strict`.

### Safe ownership

Pages are written only below `--out`, which must sit inside the content directory and the project (no `..`, no `node_modules`, no symbolic link out). A `.doq-api.json` manifest records every generated file and its hash. An existing file that the generator did not create, a generated page that someone edited and a damaged manifest make `generate` stop **before writing anything**; files that are no longer generated are deleted only when unchanged since generation; hand-written siblings are never touched. Generated pages carry `generated: doq-api` in their frontmatter and are not meant to be edited: link to them from your own guides instead, as in `[createClient](/docs/reference/generated/create-client)`.

### Limits

TypeDoc-style per-version archives, template analysis and a live source view are out of scope. Links inside Markdown are ordinary anchors (Analog does not intercept them), so following a reference link is a normal navigation to a prerendered page. Where the compiler cannot see Angular's types (the package is not installed) explicit type arguments are used and a warning says so.

## Versioned documentation (0.6)

Versioning is **optional**. Without a `versioning` setting nothing changes: same URLs, same markup, same search, no selector. A project that wants to keep the documentation of older releases readable adds archived snapshots next to its current documentation.

```ts
// src/doq.paths.ts — build-safe: imported by vite.config.ts and by the Angular app config
export const doqPaths = {
  contentDirectory: 'docs',     // the CURRENT documentation, unchanged
  basePath: '/docs',            // or '/' for a docs-first site
  versioning: {
    current: { id: 'latest', label: 'Latest' },
    archives: [
      { id: '1.3', label: 'v1.3', contentDirectory: 'docs-v1-3' },
      { id: '1.2', label: 'v1.2', contentDirectory: 'docs-v1-2' },
    ],
    // pathSegment: 'v',                          // default; the URL segment before an archive id
    // canonicalOrigin: 'https://docs.example.com', // optional: each page declares its own canonical URL
  },
} as const;
```

The same object feeds `doqPrerenderRoutes(doqPaths)` in `vite.config.ts`, `defineDoqConfig({ ...doqPaths })` and `doqRoutes(config)`; no other wiring changes.

### Content layout and URLs

Each version is an independent catalog in its own folder below `src/content`. An archive is a deliberate snapshot: nothing is copied or synchronized for you, and a version never reads another version's folder.

```text
src/content/docs/        → /docs, /docs/installation            (current, unchanged URLs)
src/content/docs-v1-3/   → /docs/v/1.3, /docs/v/1.3/installation
src/content/docs-v1-2/   → /docs/v/1.2, /docs/v/1.2/installation
```

With `basePath: '/'` the archives are `/v/1.3` and `/v/1.3/installation`. The current version has exactly one URL per page (there is no `/latest` alias), so existing links, bookmarks and search-engine entries keep working and there is no duplicate content.

- Two versions may contain the same slug and the same title; duplicate public routes inside one version still throw.
- Custom `slug` frontmatter works in every version and is matched by public slug, not file name.
- Version ids use letters, numbers, `.`, `_` and `-`; they must be unique (case-insensitively). Content directories must be separate: one may not equal or sit inside another (`docs` and `docs-v1` are fine, `docs` and `docs/v1` are not).
- The URL segment (default `v`) is **reserved** among the current version's slugs. A current document whose slug starts with it (for example `v/1.3/x`) throws, in the app and in the prerender step. Change `pathSegment` if you really need a `v/…` page.
- Invalid configuration throws a one-line diagnostic; an archive without Markdown files throws instead of silently rendering an empty version.

### Version selector and switching

When more than one version exists, a selector appears at the top of the sidebar (and therefore in the mobile drawer), or in the top bar when `sidebar: 'hidden'`, and on every index page. It is a native `<details>` whose entries are ordinary links, so every destination is a prerendered URL: the active version carries `aria-current="true"`, each entry says whether it is current or archived, Escape closes it and returns focus to its summary, and after choosing a version the new article heading takes focus. Archived pages show a short notice that links back to the latest documentation.

Switching preserves context by public identity:

| Situation | Destination |
| --- | --- |
| The target version has a document with the same public slug | that document |
| The target version does not have it | the target version's index |
| Reading an index page | the target version's index |

Nothing is guessed from similar file names, API symbols are never "translated", and an archive URL never silently shows current content.

### Search

On a versioned site every indexed page carries `data-pagefind-filter="doqsVersion:<id>"` and the search dialog passes that filter to Pagefind (`pagefind.search(query, { filters: { doqsVersion } })`), so only the version being read is searched and nothing is truncated or discarded afterwards. One index serves all versions; results link to the version-correct URL and section. If the index has no pages for the version, the dialog says the version is not indexed instead of searching another one. Unversioned sites use no filter at all. Rebuild the index with `doq-search index` after any version change.

### SEO

Current pages keep their URLs and titles. Archive titles end with the version label (`Installation · Docs · v1.3`), and archive pages are never canonicalized to current. Doqs does not know your site's origin, so it emits no canonical link by default. Set `versioning.canonicalOrigin` (an origin only, no path) to have each Doqs page declare its **own** URL as canonical; a canonical link that your host already provides is never replaced, and Doqs's link is removed again when the reader leaves the documentation.

### API reference per version

`doq-api` already takes the pieces a versioned layout needs. Document an archived checkout into the archive's own content folder, with the archive's base path:

```bash
doq-api generate --project ../old/tsconfig.json --entry ../old/src/public-api.ts \
  --content-dir src/content/docs-v1-3 --out src/content/docs-v1-3/reference/generated \
  --base-path /docs/v/1.3
```

Each run owns its own `--out` folder and manifest, `check` stays non-mutating, and regenerating the current reference cannot touch an archive. Links inside the generated pages target the version's own URLs. The documentation version is a concept you control: Doqs does not infer it from the installed package version and never analyzes Git history.

### Archiving a version

1. Copy the current content folder to a new snapshot folder (`cp -R src/content/docs src/content/docs-v2`), including the generated reference.
2. In the snapshot, fix absolute links (`/docs/…` → `/docs/v/2/…`) and regenerate the API reference with the snapshot's `--content-dir`, `--out` and `--base-path` (from a checkout of the matching tag if the API changed).
3. Add `{ id: '2', label: 'v2', contentDirectory: 'docs-v2' }` to `archives`, then update the current documentation for the new release.
4. `pnpm build` (prerenders every version and rebuilds the search index), check the archive pages, deploy.

### Limits

- Frontmatter of **all** versions is part of the application bundle (Analog's content list); document bodies load lazily per page. Very large archives therefore add a little bundle size, not a download per document.
- Prerendering needs a static host that answers 404 for URLs that were not generated (every static host does); unknown versions and documents missing from a version are 404 pages there, and a "page not found" view after in-app navigation.
- Identical heading text in several versions shares Analog's build-time heading slugger. If your project is affected by the upstream numeric-suffix problem for repeated headings (see the Angular Movement migration notes), versions with identical headings can make it more likely; compare prerendered ids with the client bundle after a build.
- No localized documentation, no automatic snapshots, no remote content, no per-version themes.

### Upgrading from 0.5

Nothing is required: a configuration without `versioning` renders exactly as before. To adopt it, add the `versioning` object above and the archive folders. `normalizeDoqPaths()` now also returns the resolved `versioning` when it is configured.

## Navigation and reading

These behaviors need no configuration:

- **Fragment links work.** Following a table-of-contents link, opening or reloading a URL with `#heading`, and client-side navigation to a fragment scroll the heading into view once the Markdown has rendered. A fragment that matches no heading is ignored. Back/Forward restore the reader's position. Headings keep the renderer's IDs (`examples`, `examples-1` for duplicates).
- **Sticky host headers.** Headings use `scroll-margin-top: var(--host-docs-scroll-offset, 2rem)`. Set `--host-docs-scroll-offset` (any CSS length) to the height of your sticky header.
- **Continuity.** After an in-app change of document (sidebar, mobile drawer, previous/next, search) the new document starts at the top and keyboard focus moves to the article heading (`tabindex="-1"`, no extra tab stop), or to the heading named by the fragment. Escape and the Close button still return focus to the menu button. Direct loads never move focus.

Doq does not change your router configuration; it does not need `withInMemoryScrolling`.

## Public API

`defineDoqConfig`, `provideDoq`, `doqRoutes`, `doqPrerenderRoutes`, `doqPrerenderRoute` (single file, kept for compatibility), `splitDoqInlineDemos`, `DOQ_INLINE_DEMO_PATTERN`, `parseDoqContent`, `DOQ_CALLOUT_TYPES`, `normalizeDoqPaths`, `joinDoqPath`, `normalizeDoqSearchConfig`, `normalizeSearchResultUrl`, `doqVersionLinks`, `DOQ_VERSION_FILTER` (0.6), the types `DoqConfig`, `DoqPaths`, `DoqSlots`, `DoqPresentation`, `DoqContentSegment`, `DoqRichSegment`, `DoqTab`, `DoqCalloutType`, `DoqSearchConfig`, `DoqSearchResult`, `DoqDemoRegistry`, `DoqPrerenderContentRoute`, `DoqVersioning`, `DoqVersionConfig`, `DoqArchiveConfig`, `DoqResolvedVersioning`, `DoqVersion`, `DoqVersionLink` (0.6), the document helpers, and the components `DoqDocsComponent`, `DoqIndexComponent`, `DoqShellComponent`, `DoqTabsComponent`, `DoqVersionSwitcherComponent`. Node-only: `@doqs/analog/search-index` (`indexDoqSearch`) and the `doq-search` binary; `@doqs/analog/api-reference` (`generateApiReference`, `checkApiReference`, `buildApiReference`, `DoqApiError`) and the `doq-api` binary (0.5). Styles: `@doqs/analog/styles.css`; new optional token `--host-docs-scroll-offset`.

## Compatibility

Built with Angular 21.2 and Analog 2.9. Angular 22 is in the peer range but not validated. Existing 0.0.0-pilot through 0.5 configuration objects keep working without changes; search and versioning are opt-in. Pagefind 1.5.x is supported (optional peer `^1.5.0`); `doq-api` needs the project's own `typescript` (optional peer `^5.5.0 || ^6.0.0`, tested with 5.9 and 6.0). See [CHANGELOG.md](./CHANGELOG.md).
