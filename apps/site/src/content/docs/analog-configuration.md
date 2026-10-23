---
title: Analog configuration
description: The four places a Doqs integration touches — paths, Vite, Angular providers and the stylesheet.
group: Start here
order: 4
---

Doqs asks for four small connections. `doq init` prints each one for your project; this page explains them. Run `pnpm exec doq doctor` at any point to see which are in place.

## 1. Share the paths

`vite.config.ts` and the Angular application must agree on where the documentation lives. Put the two values in one module that both import. Because Vite loads it at build time, it must not import Angular components.

:::code src/doq.paths.ts

```ts
export const doqPaths = {
  contentDirectory: 'docs', // src/content/docs
  basePath: '/docs', // public mount path; '/' for a docs-first application
} as const;
```

## 2. Prerender with Analog

`doqPrerenderRoutes()` expands the content folder into the routes Analog prerenders, using Doqs's own URL rule (nested folders, `index.md`, custom `slug`, `basePath`).

:::code vite.config.ts

```ts
import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import { doqPrerenderRoutes } from '@doqs/analog';
import { doqDeterministicMarkdown } from '@doqs/analog/vite';
import { doqPaths } from './src/doq.paths';

export default defineConfig({
  plugins: [
    analog({
      ssr: true,
      static: true,
      content: { highlighter: 'prism' },
      prerender: { routes: async () => ['/', ...doqPrerenderRoutes(doqPaths)] },
    }),
    doqDeterministicMarkdown(),
  ],
});
```

Keep your existing prerender routes in the same array. `content.highlighter` (`'prism'` or `'shiki'`) is required for code blocks, tabs and demos. `doqDeterministicMarkdown()` is recommended: [why](/docs/operations/deterministic-vite-plugin).

## 3. Register the providers

:::code src/app/app.config.ts

```ts
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { provideFileRouter, withExtraRoutes } from '@analogjs/router';
import { defineDoqConfig, doqRoutes, provideDoq } from '@doqs/analog';
import { doqPaths } from '../doq.paths';

const doqConfig = defineDoqConfig({ ...doqPaths });

export const appConfig: ApplicationConfig = {
  providers: [
    provideFileRouter(withExtraRoutes(doqRoutes(doqConfig))),
    provideContent(withMarkdownRenderer()),
    provideDoq(doqConfig),
  ],
};
```

> [!WARNING]
> Merge these into your existing providers. If you already pass routes to `withExtraRoutes()`, concatenate the arrays. Call `provideContent()` only once. Doqs does not replace your router configuration and removes none of your routes.

## 4. Import the stylesheet once

```css
/* src/styles.css */
@import '@doqs/analog/styles.css';
```

Doqs sets no global `html` or `body` styles; everything is scoped to `doq-` classes. See [styling](/docs/guides/styling-and-host-integration) for the tokens.

## Optional settings

The defaults display Markdown with a left sidebar and a table of contents. Everything else is opt-in:

| Setting | Effect | Page |
| --- | --- | --- |
| `search: { enabled: true }` | Pagefind search dialog | [Navigation and search](/docs/guides/navigation-and-search) |
| `versioning` | Archived documentation versions | [Versioned documentation](/docs/guides/versioned-documentation) |
| `demos` | Angular components inside Markdown | [Interactive components](/docs/guides/interactive-components) |
| `sidebar`, `contentWidth`, `showTableOfContents` | Layout | [Styling](/docs/guides/styling-and-host-integration) |
| `slots`, `presentation` | Host-owned components and copy | [Styling](/docs/guides/styling-and-host-integration) |
