---
title: Docs-first applications
description: Make the whole application documentation by mounting Doqs at the root.
group: Guides
order: 11
---

A docs-first application has no landing page of its own: the documentation index is the home page and documents live at `/<slug>`.

```bash
pnpm exec doq init --mode docs-first
```

```ts
export const doqPaths = { contentDirectory: 'docs', basePath: '/' } as const;
```

| File | URL |
| --- | --- |
| `src/content/docs/introduction.md` | `/introduction` |
| `src/content/docs/guides/setup.md` | `/guides/setup` |
| (index) | `/` |

## Rules for the root mount

- Do not add `src/app/pages/index.page.ts`; the documentation index owns `/`.
- Pass `doqPrerenderRoutes(doqPaths)` without a leading `'/'`: with `basePath: '/'` the helper already includes the index route.
- `DoqShellComponent` is an optional neutral header and footer for projects that have none. It takes `docsPath="/"` in this mode.
- Archived versions, when used, live at `/v/<id>`.

> [!NOTE]
> `doq init --mode docs-first` accepts only the root mount. For any other path, use [embedded mode](/docs/guides/embedded-documentation) with `--base-path`.
