# @getdoq/analog

Documentation that lives inside your Angular/[Analog](https://analogjs.org) app. Doq adds a Markdown-driven documentation region — routing, sidebar, table of contents, index, code blocks — and leaves your header, footer, routes, theme and components to you.

Version **0.1.0**. Not yet published to npm; install from a packed tarball (`pnpm pack:doq` in the Doq repository).

## What Analog requires vs. what Doq adds

| Step | Required by | Notes |
| --- | --- | --- |
| `provideFileRouter()`, `provideContent(withMarkdownRenderer())` | Analog | Doq does not replace or configure them. |
| `prerender` routes in `vite.config.ts` | Analog | Doq supplies `doqPrerenderRoutes()` to generate them. |
| `prismjs` and the Analog content peers | Analog | `@analogjs/content`, `@analogjs/router` and `prismjs` stay your dependencies. |
| `doqRoutes()`, `provideDoq()`, `defineDoqConfig()` | Doq | Docs routing and configuration. |
| `@import '@getdoq/analog/styles.css'` | Doq | Once, in your global stylesheet. |

## Quick start

```sh
pnpm add ./getdoq-analog-0.1.0.tgz @analogjs/content @analogjs/router prismjs
```

```css
/* src/styles.css */
@import '@getdoq/analog/styles.css';
```

**1. Share the paths once.** This module is imported by `vite.config.ts`, so keep it free of Angular components.

```ts
// src/doq.paths.ts
export const doqPaths = { contentDirectory: 'docs', basePath: '/docs' } as const;
```

**2. Prerender with Analog.**

```ts
// vite.config.ts
import { doqPrerenderRoutes } from '@getdoq/analog';
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
import { defineDoqConfig, doqRoutes, provideDoq } from '@getdoq/analog';
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
| `basePath` | `'/docs'` | Public mount path. |
| `routeParam` | `'slug'` | Router parameter name (use the same config for `doqRoutes` and `provideDoq`). |
| `contentWidth` | `'46rem'` | Article width, any CSS length. |
| `sidebar` | `'left'` | `'left'`, `'right'` or `'hidden'`. |
| `sidebarWidth` | `'16rem'` | Sidebar width. |
| `showTableOfContents` | `true` | The “On this page” index. |
| `demos` | none | Registry of host components by frontmatter ID. |
| `slots` | none | Host-owned components at two stable locations. |
| `presentation` | none | Product-specific copy and title suffix. |

### Presentation

| Field | Default | Used for |
| --- | --- | --- |
| `documentationLabel` | `'Documentation'` (breadcrumb root `'Docs'`) | Index eyebrow, navigation label, mobile menu button, breadcrumb root when set. |
| `indexTitle` | `'Explore the docs'` | Index `<h1>` and page title. |
| `indexDescription` | `'Browse guides and references for this product.'` | Index intro and meta description. |
| `pageTitleSuffix` | `'Documentation'` | Document titles: `Button · Acme`. `''` removes the suffix. |

Titles and descriptions are scoped: Doq captures your page's own title and description when a docs page opens and restores them when you navigate away; a document without a `description` shows your host description instead of the previous document's. An unknown docs URL gets `Page not found · <suffix>`.

### Demos, slots, CSS tokens and the shell

- **Demos** (`demos`) attach one interactive component to *one document* through its `demo:` frontmatter ID. Unknown IDs render an accessible fallback.
- **Slots** (`slots`) add the *same* host component to *every* page of a kind: `indexAfterIntro` renders between the index introduction and the document cards; `documentAfterContent` renders after the Markdown content and demo of each document. They are created with `NgComponentOutlet`, receive no inputs (inject host services instead), need no wrapper or selectors, and have no effect when omitted. They are standalone Angular components owned by your app; Doq never imports them.
- **CSS tokens** restyle Doq without code. Set these on an ancestor of the docs: `--host-docs-background`, `--host-docs-foreground`, `--host-docs-primary`, `--host-docs-secondary`, `--host-docs-muted`, `--host-docs-border`, `--host-docs-surface`, `--host-docs-focus`, `--host-docs-code-background`, `--host-docs-code-foreground`. Doq sets no global `html`/`body` styles. Slots can use the same tokens.
- **`DoqShellComponent`** is an optional neutral page shell for projects without one. Existing applications do not need it.

## Public API

`defineDoqConfig`, `provideDoq`, `doqRoutes`, `doqPrerenderRoutes`, `doqPrerenderRoute` (single file, kept for compatibility), `normalizeDoqPaths`, the types `DoqConfig`, `DoqPaths`, `DoqSlots`, `DoqPresentation`, `DoqDemoRegistry`, `DoqPrerenderContentRoute`, the document helpers, and the components `DoqDocsComponent`, `DoqIndexComponent`, `DoqShellComponent`. Styles: `@getdoq/analog/styles.css`.

## Compatibility

Built with Angular 21.2 and Analog 2.9. Angular 22 is in the peer range but not validated. Existing 0.0.0-pilot configuration objects keep working without changes. See [CHANGELOG.md](./CHANGELOG.md).
