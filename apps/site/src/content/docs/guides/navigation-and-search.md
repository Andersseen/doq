---
title: Navigation and search
description: Sidebar, table of contents, focus handling and optional static full-text search with Pagefind.
group: Guides
order: 15
---

## Navigation

- The sidebar groups documents by `group` and sorts them by `order`. On narrow screens it becomes a drawer.
- "On this page" lists the headings; fragment links scroll to the heading, including after a reload.
- After moving to another document, focus lands on the new article heading. Direct loads never move focus.
- Previous and next links follow the sidebar order.

## Search

Search needs no backend. Pagefind builds a static index from the prerendered HTML, and the browser downloads only the pieces a query needs. It is off by default.

:::steps

1. **Enable it** in the Doqs configuration.

   ```ts
   const doqConfig = defineDoqConfig({ ...doqPaths, search: { enabled: true } });
   ```

2. **Install Pagefind** as a development dependency.

   ```bash
   pnpm add -D pagefind
   ```

3. **Index after the build.**

   ```json
   "scripts": { "build": "vite build && doq-search index dist/analog/public" }
   ```

:::

`doq-search index <siteDir>` removes any previous bundle, indexes only the article content Doqs marks with `data-pagefind-body` and fails with a clear message if the site was not prerendered or Pagefind is missing. Your landing page, header, sidebar and demos are not indexed.

## What readers get

A search button opens a native dialog; Ctrl+K or ⌘K opens it while a documentation page is shown. Results show the title, the matching section and an excerpt, link to the canonical URL and open the section. Arrow keys move through results, Enter opens one, Escape closes the dialog. If the index is missing, the dialog says search is unavailable and the page keeps working. Under `vite dev` no index exists; preview the static build to try it.

| Option | Default | Purpose |
| --- | --- | --- |
| `search.enabled` | `false` | Show the search button |
| `search.bundlePath` | `/pagefind/` | Where the bundle is served |

> [!NOTE]
> The Pagefind scripts load on the first query only, and only inside documentation pages. The landing page never requests them.
