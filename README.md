# Doq pilot

Doq is an experimental Angular documentation package for Analog.js. It adds Markdown pages and reusable documentation navigation to an existing app while the host keeps its own routes, header, footer, brand, type, and theme. This is an architecture pilot, not a 0.1 release or a published package.

## Architecture

- `packages/doq` is the Angular library. ng-packagr builds it in partial compilation mode. Doq uses Analog's public content discovery, file loader, Markdown renderer, and Angular Router APIs.
- `apps/showcase-a` is a dark-first component-library host with a left navigation, its own styles, and a Vanta button demo.
- `apps/showcase-b` is a light-first developer-platform host with a right navigation, independent styles, and a Forge schema demo.
- Each app owns its shell, content files, and demo components. The two apps use the same Doq package and do not provide Doq's navigation or rendering code.

The workspace has been built with Node 22.23.1, pnpm 10.18.3, Analog 2.9.0, Angular 21.2.x, TypeScript 5.9.3, and Vite 8.3.x. A clean external tarball consumer also built successfully with Analog 2.9.1 and Angular 21.2.25. Angular 22 is in the package peer range but has not been validated. Keep Doq experimental; this is not a 0.1 release.

## Workspace commands

```sh
pnpm install
pnpm dev:a
pnpm dev:b
pnpm build
pnpm --filter @getdoq/analog build
pnpm pack:doq
```

`pnpm pack:doq` builds and creates `artifacts/getdoq-analog-0.0.0-pilot.tgz`; it does not publish. `pnpm --filter showcase-a preview` and `pnpm --filter showcase-b preview` serve the generated `dist/analog/public` directories after building. The preview server maps generated `index.html` files to deep URLs and returns 404 when a file is missing.

## Install into an Analog application

Doq is not published. To install the locally built artifact from an existing app:

```sh
pnpm add /path/to/getdoq-analog-0.0.0-pilot.tgz @analogjs/content @analogjs/router prismjs
```

Import the package CSS once from the host's global stylesheet:

```css
@import '@getdoq/analog/styles.css';
```

Configure the same `basePath` and `routeParam` for the Router matcher and provider. `routeParam` defaults to `slug`; a custom value is supported. `contentDirectory` names the folder below `src/content`.

```ts
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { provideFileRouter, withExtraRoutes } from '@analogjs/router';
import { doqRoutes, provideDoq } from '@getdoq/analog';

const doqConfig = {
  contentDirectory: 'docs',
  basePath: '/docs',
  routeParam: 'slug',
  contentWidth: '48rem',
  sidebar: 'left' as const, // 'left' | 'right' | 'hidden'
  sidebarWidth: '16rem',
  showTableOfContents: true,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideFileRouter(withExtraRoutes(doqRoutes(doqConfig))),
    provideContent(withMarkdownRenderer()),
    provideDoq(doqConfig),
  ],
};
```

Keep the host's existing shell around `<router-outlet>`; Doq supplies the docs region, not a replacement site header or footer. `doqRoutes()` uses Angular's public `UrlMatcher`, mounts the index at `/docs`, and captures a nested path as one route parameter. Other application routes remain owned by the host.

## Markdown and canonical URLs

Add Markdown under `src/content/<contentDirectory>`. A source file such as `src/content/docs/guides/setup.md` defaults to `/docs/guides/setup`. A frontmatter `slug` replaces the entire URL path below `basePath`; for example `slug: getting-started` produces `/docs/getting-started`, and `slug: quickstart/setup` produces `/docs/quickstart/setup`, regardless of the source folder. Slug segments accept letters, numbers, `_`, `-`, and `~`. Empty/invalid slugs and duplicate public routes throw a diagnostic naming the source files.

The canonical document catalog drives the index, sidebar, breadcrumbs, previous/next links, content lookup, and route resolution. Doq resolves a public route back to its discovered Analog source file, then passes the Markdown body through Analog's renderer. It does not replace Analog's compiler or maintain a separate consumer slug map.

```markdown
---
title: Setup
slug: quickstart/setup
description: Configure the application.
group: Guides
order: 3
demo: product-button
---

## Configure the host
```

Navigation is ordered by `order`, then public route. The `group` metadata forms collapsible sidebar sections; when omitted, the source directory provides a grouping label. Previous/next links follow that same order. `MarkdownComponent` provides heading IDs and the TOC links to those IDs. Copy controls are attached once after a document renders, not during every Angular check.

## Static generation

Analog prerendering is configured by the host. Reuse Doq's route helper so custom slugs, nested sources, and `basePath` follow the same canonical rule:

```ts
import { doqPrerenderRoute } from '@getdoq/analog';

analog({
  ssr: true,
  static: true,
  content: { highlighter: 'prism' }, // requires the consumer's prismjs dependency
  prerender: {
    routes: async () => [
      '/', '/docs',
      {
        contentDir: 'src/content/docs',
        recursive: true,
        transform: file => doqPrerenderRoute(file, '/docs'),
      },
    ],
  },
});
```

List any non-content host routes that should be prerendered alongside documentation. Serve the generated `dist/analog/public` directory with directory index resolution to support direct links. The included preview server returns HTTP 404 for absent files. Production static hosts should configure their own 404 behavior; an SPA fallback can otherwise return HTTP 200 for an unknown route.

## Theme and composition

The host owns its theme switch and can expose semantic CSS custom properties on an ancestor of the routed docs. Doq has scoped defaults when optional values are missing; it does not set global `html` or `body` styles.

| Doq role | Optional host custom property |
| --- | --- |
| Background / foreground | `--host-docs-background`, `--host-docs-foreground` |
| Primary / secondary | `--host-docs-primary`, `--host-docs-secondary` |
| Muted / border / surface | `--host-docs-muted`, `--host-docs-border`, `--host-docs-surface` |
| Focus | `--host-docs-focus` |
| Code background / foreground | `--host-docs-code-background`, `--host-docs-code-foreground` |

`contentWidth`, `sidebar`, `sidebarWidth`, and `showTableOfContents` configure the docs region. Mobile navigation uses a focusable drawer with Escape handling and focus return. The TOC moves into the article when the viewport does not have room for a side rail and tracks visible headings in the browser. `DoqShellComponent` is optional for a new host that wants a neutral starter shell.

## Consumer-owned Angular demos

Register standalone Angular components by stable ID in `DoqConfig.demos`, then reference the ID in Markdown `demo` metadata. Doq renders them with Angular's `NgComponentOutlet`; it does not compile arbitrary templates from Markdown.

```ts
const doqConfig = {
  contentDirectory: 'docs',
  demos: { 'product-button': ProductButtonDemoComponent },
};
```

Unknown IDs show an accessible fallback. Demo components are currently registered eagerly. A legacy package-owned `button` demo is retained for compatibility with the pilot showcase.

## Package contents and verification

The package tarball contains `fesm2022/getdoq-analog.mjs`, `types/getdoq-analog.d.ts`, `styles.css`, `README.md`, and package metadata. Public exports are `@getdoq/analog` and `@getdoq/analog/styles.css`.

Build both showcase production apps with `pnpm build`, inspect the generated HTML under each app's `dist/analog/public`, then use the app's `preview` script to check direct routes and status codes. The generated pages should include Markdown content, metadata, headings, TOC links, host shell, and navigation. Do not treat an output file's existence alone as proof of successful rendering.

The tarball was installed into a separate Analog consumer at `/private/tmp/doq-external-consumer` using its own manifest and lockfile, then built successfully with `pnpm build`. The consumer resolved `@getdoq/analog` from the packed `0.0.0-pilot` archive, not from the workspace. Its pages verified custom nested slugs, ordinary nested routes, static rendering, and the host shell. No package was published.
