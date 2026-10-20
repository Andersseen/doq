# @getdoq/analog

Experimental Angular documentation infrastructure for Analog.js. Doq is an architecture pilot, is not published, and has only been built with Angular 21.2.x and Analog 2.9.0.

## Install and configure

Install the generated tarball together with Analog content and routing:

```sh
pnpm add /path/to/getdoq-analog-0.0.0-pilot.tgz @analogjs/content @analogjs/router prismjs
```

Import `@getdoq/analog/styles.css` once in the host stylesheet. Provide Analog's Markdown renderer, mount the Doq routes, and pass the same route configuration to `doqRoutes()` and `provideDoq()`:

```ts
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { provideFileRouter, withExtraRoutes } from '@analogjs/router';
import { doqRoutes, provideDoq } from '@getdoq/analog';

const config = {
  contentDirectory: 'docs',
  basePath: '/docs',
  routeParam: 'slug',
  sidebar: 'left' as const,
  showTableOfContents: true,
};

provideFileRouter(withExtraRoutes(doqRoutes(config)));
provideContent(withMarkdownRenderer());
provideDoq(config);
```

`contentDirectory: 'docs'` reads Markdown from `src/content/docs`. `basePath` defaults to `/docs`, and `routeParam` defaults to `slug`. Keep the host's own header/footer around its Router outlet. Import Doq's stylesheet once; the host keeps responsibility for the brand, theme state, and global typography.

## Canonical routes and prerendering

A Markdown file at `src/content/docs/guides/setup.md` defaults to `/docs/guides/setup`. Frontmatter `slug` replaces the whole path below the base path: `slug: getting-started` gives `/docs/getting-started`; `slug: quickstart/setup` gives `/docs/quickstart/setup`. Segments support letters, numbers, `_`, `-`, and `~`. Invalid slugs and duplicate public routes produce an error with source filenames.

The same normalized catalog drives content lookup, index cards, navigation, breadcrumbs, and previous/next links. Analog's public content-file map is used to locate the source document and Analog's public Markdown renderer provides heading metadata and the rendered body. For static output, configure Analog in the host Vite file:

```ts
import { doqPrerenderRoute } from '@getdoq/analog';

// Add to Analog's `prerender.routes` array:
{
  contentDir: 'src/content/docs',
  recursive: true,
  transform: file => doqPrerenderRoute(file, '/docs'),
}
```

The host should list additional app routes to prerender. Configure the static host to resolve directories to their generated `index.html` and to serve an appropriate 404 document for missing paths.

The host's Analog Vite configuration must enable its content integration. The showcase and external-consumer examples use Analog's Prism highlighter, so install the host-side `prismjs` dependency and configure `content: { highlighter: 'prism' }` as shown in the root README.

## UI, theming, and demos

`DoqConfig` options are `contentDirectory`, `basePath`, `routeParam`, `contentWidth`, `sidebar` (`left`, `right`, or `hidden`), `sidebarWidth`, `showTableOfContents`, and `demos`. Documents support `title`, `description`, `group`, `order`, `slug`, and `demo` metadata. `group` creates a collapsible navigation section; navigation order is `order` then public route.

Optional host CSS properties include `--host-docs-background`, `--host-docs-foreground`, `--host-docs-primary`, `--host-docs-secondary`, `--host-docs-muted`, `--host-docs-border`, `--host-docs-surface`, `--host-docs-focus`, `--host-docs-code-background`, and `--host-docs-code-foreground`. Missing values use scoped defaults.

Register consumer-owned standalone components in `demos`, keyed by the Markdown `demo` value. Doq renders them with `NgComponentOutlet`, with no arbitrary template compilation. The pilot registry is eager. `DoqShellComponent` and the built-in `DoqButtonDemoComponent` are optional helpers; hosts can retain their own complete site shell and demos.

## Build and verify

In this repository, use `pnpm --filter @getdoq/analog build` to build the library and `pnpm pack:doq` to produce the unpublished local tarball. See the root README for showcase builds, static preview, package exports, and the current external installation verification status.
