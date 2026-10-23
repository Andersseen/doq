---
title: Embedded documentation
description: Mount Doqs under /docs in a product site that keeps its own landing page and routes.
group: Guides
order: 10
---

Embedded mode is the default. Doqs owns one region of your application, `/docs`; everything else (the landing page, other routes, header and footer) stays yours. This site is an example: the landing at `/` and the documentation you are reading are one Analog application.

## Set it up

```bash
pnpm exec doq init --mode embedded
```

```ts
export const doqPaths = { contentDirectory: 'docs', basePath: '/docs' } as const;
```

A Markdown file at `src/content/docs/guides/setup.md` is served at `/docs/guides/setup`. The documentation index is `/docs`.

## Use another mount path

Choose any path whose segments contain letters, numbers, `_`, `-` or `~`. This is how documentation is introduced gradually next to existing `/docs` routes:

```bash
pnpm exec doq init --base-path /handbook --content-dir handbook
```

## Keep your layout

Doqs renders inside your router outlet, so your root component's header and footer surround it. Each Doqs view has its own `main` landmark. Your routes are never replaced: `doqRoutes()` returns extra routes that you pass to `withExtraRoutes()`.

> [!TIP]
> Link to documentation with plain absolute paths such as `/docs/installation`. In a sticky-header layout, set `--host-docs-scroll-offset` to your header height so headings are not hidden by it.

## Metadata

While a Doqs page is open, its title and description replace the host's; when the reader leaves, the host's values are restored. A document without a `description` shows the host's description instead of the previous document's. See [Styling and host integration](/docs/guides/styling-and-host-integration) for the title suffix.
