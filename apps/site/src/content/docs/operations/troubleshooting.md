---
title: Troubleshooting
description: Common integration problems and the doq doctor findings that point to them.
group: Operations
order: 22
---

Start with `pnpm exec doq doctor`. Each finding names the file and the fix.

## The documentation is unstyled

The stylesheet is not imported. Add `@import '@doqs/analog/styles.css';` to your global stylesheet. Doctor reports this as `Doqs stylesheet`.

## `/docs` returns 404

- The paths file and the Angular providers disagree: pass the same `doqPaths` to `defineDoqConfig()` in the app and to `doqPrerenderRoutes()` in `vite.config.ts`.
- `doqRoutes(doqConfig)` is not passed to `withExtraRoutes()`.
- On static hosting, the route was not prerendered. Run `doq doctor --build`.

## `doqDeterministicMarkdown: no "analogjs-content-file" plugin`

The helper found no Analog Markdown plugin. Place it after `analog()` in the same Vite configuration, or remove it if you do not render Markdown through `@analogjs/platform`. [Details](/docs/operations/deterministic-vite-plugin).

## Duplicate public route

Two documents resolve to one URL. The error names both files; change one `slug` or file name.

## Invalid `contentDirectory` or `basePath`

`contentDirectory` is a folder below `src/content` (`docs`, never `..`). `basePath` starts with `/` and has no `..` segments; use `/` only for a [docs-first application](/docs/guides/docs-first-applications).

## Search shows "unavailable"

The index is missing. Run `doq-search index <output dir>` after the build, and install `pagefind`. Under `vite dev` no index exists.

## A demo says it is not registered

The id in `::demo[id]` or `demo:` is not a key of `demos` in `defineDoqConfig()`. Ids are case-sensitive.

## `doq-api` stops before writing

The output folder is outside the content folder, contains files `doq-api` did not create, or contains an edited generated page. Choose an empty `--out` folder inside the content folder.

## Peer version failures

Doctor compares the installed Angular, RxJS and other peers with the ranges `@doqs/analog` declares. Install versions inside the range, or see [compatibility](/docs/reference/migration-and-compatibility).
