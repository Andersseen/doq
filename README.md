# Doq pilot

Doq is an Angular documentation UI and Analog.js integration for teams that want Markdown documentation inside an existing product. The host keeps its routes, header, footer, typography, theme state, and global design tokens. Doq supplies document navigation and reusable docs page components.

This is an experimental architecture pilot. The package name `@getdoq/analog` is provisional and is not published.

## Workspace

```text
apps/showcase-a/   Vanta UI: dark-first component library
apps/showcase-b/   ForgeCMS: light-first developer platform
packages/doq/      The single reusable Angular package
```

Both apps use Analog 2.9, Angular 21.2, Tailwind CSS 4, the same Doq package, and their own `src/content/docs` tree. Showcase A also uses the published Volt button API. Both use Lumen Icons through a tree-shakable per-icon entry point. No copy of these libraries is included in Doq.

## Install and run

Requires Node 22+ and pnpm 10+.

```bash
pnpm install
pnpm dev:a   # http://localhost:5173
pnpm dev:b   # http://localhost:5173 (run one at a time)
```

Each app can run on its own port:

```bash
pnpm --filter showcase-a dev -- --port 5173
pnpm --filter showcase-b dev -- --port 5174
```

Build each app or the whole Turbo pipeline:

```bash
pnpm --filter @getdoq/analog build
pnpm --filter showcase-a build
pnpm --filter showcase-b build
pnpm build
```

Create a local package artifact with `pnpm pack:doq`. It writes a `.tgz` file to `artifacts/`; no publish is performed. The package exports its Angular entry at `@getdoq/analog` and scoped CSS at `@getdoq/analog/styles.css`.

## Integrate in another Analog app

Install the package and keep Analog's content integration enabled:

```bash
pnpm add @getdoq/analog @analogjs/content
```

Provide Analog's content integration and Doq once in `src/app/app.config.ts`. Analog also registers direct Markdown routes, so `withExtraRoutes` puts the Doq route ahead of those generated routes under `/docs/**` while leaving other app routes intact. The folder path is relative to `src/content`:

```ts
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { provideFileRouter, withExtraRoutes } from '@analogjs/router';
import { doqRoutes, provideDoq } from '@getdoq/analog';

const doqConfig = {
  contentDirectory: 'docs', basePath: '/docs', routeParam: 'slug',
  contentWidth: '48rem', sidebar: 'left' as const,
  sidebarWidth: '16rem', showTableOfContents: true,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideFileRouter(withExtraRoutes(doqRoutes(doqConfig))),
    provideContent(withMarkdownRenderer()),
    provideDoq(doqConfig),
  ],
};
```

Import the package stylesheet once from the host's global stylesheet. Tailwind utilities are not required by Doq and its styles are distributed directly, rather than relying on consumer scanning of `node_modules`:

```css
@import '@getdoq/analog/styles.css';
```

Keep the existing application shell around `<router-outlet>` to retain its header, footer, and global navigation. `doqRoutes()` uses Angular's public `UrlMatcher` API to capture a nested path as one content slug, and `withExtraRoutes` puts it before Analog's Markdown routes without one component file per document.

Add Markdown beneath `src/content/docs`. Nested folders become nested path segments and the content file list drives the index and sidebar:

```markdown
---
title: Configuration
description: Configure a workspace.
group: Guides
order: 4
---

## Defaults

The page body is rendered with Analog's Markdown content renderer.
```

For SSG, configure Analog prerender routes from the same content directory (as the showcases do):

```ts
analog({
  ssr: true,
  static: true,
  prerender: { routes: async () => [
    '/', '/docs',
    {
      contentDir: 'src/content/docs',
      recursive: true,
      transform: file => file.relativePath
        ? `/docs/${file.relativePath}/${file.attributes['slug'] || file.name}`
        : `/docs/${file.attributes['slug'] || file.name}`,
    },
  ] },
});
```

## Theme and host composition

The host owns its top-level shell and theme state. Put the header/footer around `<router-outlet>` (as the showcases do), then switch host variables on that shell. Doq reads these inherited semantic values:

| Doq role | CSS variable |
| --- | --- |
| Background / foreground | `--host-docs-background`, `--host-docs-foreground` |
| Primary / secondary | `--host-docs-primary`, `--host-docs-secondary` |
| Muted / border / surface | `--host-docs-muted`, `--host-docs-border`, `--host-docs-surface` |
| Focus | `--host-docs-focus` |
| Code surface and text | `--host-docs-code-background`, `--host-docs-code-foreground` |

Doq provides scoped fallbacks when a host does not define a role. It does not set global body/html rules. Its stylesheet is limited to `.doq-root` and `.doq-index` descendants.

The typed layout options `contentWidth`, `sidebar`, `sidebarWidth`, and `showTableOfContents` customize the documentation region without replacing the host header or footer. `sidebar` accepts `left`, `right`, or `hidden`. Showcase A uses a compact left rail plus TOC; Showcase B uses a wider article and right rail with a different shell and type scale.

For an app that does not have a site shell yet, the package also exports an optional neutral `DoqShellComponent`:

```ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DoqShellComponent } from '@getdoq/analog';

@Component({
  standalone: true,
  imports: [DoqShellComponent, RouterOutlet],
  template: `
    <doq-shell productName="Northstar API" docsPath="/docs" brandMark="N">
      <router-outlet />
    </doq-shell>
  `,
})
export class App {}
```

The host can project `[doq-header-extra]` and `[doq-footer]` content into this shell, or retain its own shell as both showcases do.

An optional Angular preview is selected by `demo: button` frontmatter. This uses an explicit, package-owned Angular component with signal state; Markdown does not compile Angular tags and Doq does not claim MDX support.

## Known pilot boundaries

- Navigation and document metadata come from Analog's content file list. This pilot expects the content root to be `src/content/<contentDirectory>`.
- Markdown heading extraction for the TOC uses the source heading text and Analog/Marked-generated anchor IDs. Unusual heading plugins or custom slug rules may require a future adapter contract.
- Pagefind is deferred; the pilot does not show a pretend search control.
- Syntax highlighting comes from Analog's Prism integration. Code blocks receive a browser-only copy button after hydration.
- The navigation presentation is intentionally minimal and does not yet implement nested collapsible groups.
- `angular-movement` is not included; the layouts use restrained CSS and honor reduced-motion preferences.
- `doqRoutes()` and `provideDoq()` should use the same `basePath` and `routeParam` settings.
