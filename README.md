# Doq pilot

Doq is an experimental Angular documentation package for Analog.js. It provides Markdown document layouts and navigation while the host application keeps its own routes, header, footer, visual identity, typography, and theme state. The implementation is a pilot, not a 1.0 release.

## Architecture and verified runtime

- `packages/doq` is the single Angular library, built in partial compilation mode with ng-packagr. It consumes Analog's content APIs and exports Angular standalone components, route helpers, config providers, and scoped CSS.
- `apps/showcase-a` is a dark-first component-library-style host with a left documentation sidebar, TOC, and a consumer-owned button demo.
- `apps/showcase-b` is a light-first developer-platform-style host with its own typography, shell, right sidebar, and a different consumer-owned schema demo.
- The showcases keep separate layouts, styles, demos, and Markdown sources. Both use the same package.

Verified here with Node 22.23.1, pnpm 10.18.3, Analog 2.9.0, Angular 21.2.x, TypeScript 5.9.3, and Vite 8.3.x. Package peer ranges currently allow Angular 21.2 or 22, but this pilot has only been built against Angular 21.2. Analog 2.9 is the integration version exercised here.

## Workspace setup

```sh
pnpm install
pnpm dev:a
pnpm dev:b
pnpm build
pnpm --filter @getdoq/analog build
pnpm pack:doq
```

Both dev scripts use port 5173 by default; run only one at a time or pass a Vite port argument. `pnpm build` runs the Turbo graph: package build followed by both app builds. `pnpm pack:doq` creates `artifacts/getdoq-analog-0.0.0-pilot.tgz`; it does not publish.

For a production static preview, run `pnpm --filter showcase-a preview` or `pnpm --filter showcase-b preview` after building. The preview serves Analog's generated `dist/analog/public` directory and returns 404 for missing files.

## Install into an Analog application

Install `@getdoq/analog` from a package tarball (or a future published version), plus Analog's content and router packages. This pilot package is not published to npm. A consumer must import the distributed stylesheet, provide Analog content rendering, mount Doq routes, and provide matching Doq config:

```ts
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { provideFileRouter, withExtraRoutes } from '@analogjs/router';
import { doqRoutes, provideDoq } from '@getdoq/analog';

const doqConfig = {
  contentDirectory: 'docs', // src/content/docs
  basePath: '/docs',
  routeParam: 'slug',
  contentWidth: '48rem',
  sidebar: 'left' as const,
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

Add the package stylesheet once to the host global stylesheet:

```css
@import '@getdoq/analog/styles.css';
```

Keep the host's existing shell around `<router-outlet>` to retain its header and footer. `doqRoutes()` uses Angular's public `UrlMatcher`; it mounts the docs index at `/docs` and captures arbitrarily nested paths below that base. Keep `basePath` and `routeParam` aligned between `doqRoutes()` and `provideDoq()`.

Analog prerender route configuration remains a host responsibility. For a docs tree under `src/content/docs`, the showcases use Analog's content route expansion:

```ts
analog({
  ssr: true,
  static: true,
  content: { highlighter: 'prism' },
  prerender: {
    routes: async () => [
      '/',
      '/docs',
      {
        contentDir: 'src/content/docs',
        recursive: true,
        transform: file => file.relativePath
          ? `/docs/${file.relativePath}/${file.name}`
          : `/docs/${file.name}`,
      },
    ],
  },
});
```

Static hosts should serve the generated `dist/analog/public` tree so a nested URL maps to its prerendered `index.html`. The `slug` override is excluded from this example because the current content lookup limitation below makes it unsafe to use.

## Markdown, routes, and metadata

Put Markdown under `src/content/<contentDirectory>`. Nested directories map to nested URLs, such as `src/content/docs/guides/setup.md` to `/docs/guides/setup`. Doq builds the index and sidebar from Analog's content file list and sorts by `order`, then route path. Supported frontmatter fields are `title`, `description`, `group`, `order`, `slug`, and `demo`.

```markdown
---
title: Configuration
description: Configure a workspace.
group: Guides
order: 4
---

## Defaults

The article body is rendered by Analog's Markdown renderer.
```

The package currently normalizes a `slug` override for navigation URLs, but Analog's `injectContent` lookup still resolves content by source filename. Do not rely on custom slug overrides until that source-to-route lookup is completed and verified. Duplicate routes are not currently diagnosed.

## Consumer Angular demos

Demos are standalone Angular components owned by the host. Register a component by stable ID in the same object passed to `provideDoq`, then reference the ID in Markdown. Doq creates the component through Angular's `NgComponentOutlet`; it does not compile templates from Markdown.

```ts
import { provideDoq } from '@getdoq/analog';
import { ProductButtonDemoComponent } from './demos/product-button-demo';

const doqConfig = {
  contentDirectory: 'docs',
  basePath: '/docs',
  routeParam: 'slug',
  demos: { 'product-button': ProductButtonDemoComponent },
};
// provideDoq(doqConfig)
```

```yaml
demo: product-button
```

The pilot showcases use separate consumer-owned demo components. The old package-owned `button` demo remains as a small compatibility example. Demo components currently load eagerly; asynchronous lazy demo loading has not been implemented.

## Theme and layout composition

The host owns theme switching and provides semantic tokens on an ancestor of the routed docs. Doq uses scoped defaults when optional tokens are absent and does not set global `html` or `body` styles.

| Doq role | Host CSS custom property |
| --- | --- |
| Background / foreground | `--host-docs-background`, `--host-docs-foreground` |
| Primary / secondary | `--host-docs-primary`, `--host-docs-secondary` |
| Muted / border / surface | `--host-docs-muted`, `--host-docs-border`, `--host-docs-surface` |
| Focus | `--host-docs-focus` |
| Code background / foreground | `--host-docs-code-background`, `--host-docs-code-foreground` |

`contentWidth`, `sidebar`, `sidebarWidth`, and `showTableOfContents` adjust the docs region. `sidebar` accepts `left`, `right`, or `hidden`. The host can keep any page header/footer around the outlet. `DoqShellComponent` is optional for hosts that need a neutral starter shell.

## Current limitations

- External pnpm installation of the tarball was not completed in the validation environment because the configured pnpm store was not writable and the npm registry was unreachable. The artifact was unpacked into an isolated consumer and built using the already installed dependency tree; this does not count as a clean package-manager install.
- Custom frontmatter slugs are normalized in navigation, but content lookup still uses source filename slugs; this mismatch must be fixed before relying on overrides.
- Navigation groups are labels, not collapsible groups. The sidebar collapses to a horizontally scrollable rail on small screens; no mobile drawer is provided.
- TOC entries use Analog's generated IDs, but active heading tracking and observer cleanup are not implemented. TOC behavior has not been visually checked on mobile.
- Copy controls are added to rendered code blocks in a browser-only post-render scan. Clipboard success and failure are exposed, but no Prism theme is bundled by Doq.
- Doq does not currently validate duplicate routes or invalid frontmatter beyond skipping unsafe source paths.
- Search is deferred; no placeholder search field is included.
