---
title: Versioned documentation
description: Keep the documentation of older releases readable at stable URLs.
group: Guides
order: 16
---

Versioning is optional. Without a `versioning` setting nothing changes. This site does not use it, because Doqs documents only its latest release, so the example below is illustrative.

```ts
export const doqPaths = {
  contentDirectory: 'docs', // the CURRENT documentation
  basePath: '/docs',
  versioning: {
    current: { id: 'latest', label: 'Latest' },
    archives: [
      { id: '1.3', label: 'v1.3', contentDirectory: 'docs-v1-3' },
      { id: '1.2', label: 'v1.2', contentDirectory: 'docs-v1-2' },
    ],
  },
} as const;
```

## Layout and URLs

Each version is an independent folder; nothing is copied or synchronized for you.

```text
src/content/docs/        → /docs, /docs/installation
src/content/docs-v1-3/   → /docs/v/1.3, /docs/v/1.3/installation
src/content/docs-v1-2/   → /docs/v/1.2, /docs/v/1.2/installation
```

The current version has exactly one URL per page, so existing links keep working. With `basePath: '/'` the archives are `/v/1.3`.

## Rules

- Version ids are unique and use letters, numbers, `.`, `_` and `-`.
- Content folders must not equal or contain one another (`docs` and `docs-v1` are fine; `docs` and `docs/v1` are not).
- The first slug segment `v` is reserved in the current version; change `versioning.pathSegment` if you need it.
- An archive without Markdown files is an error rather than an empty version.

## Selector and switching

With more than one version, a native selector appears in the sidebar. Switching keeps context by public slug: the same document if the target version has it, otherwise that version's index. Archived pages show a notice linking to the latest documentation.

## Search and SEO

One index serves all versions; the dialog filters to the version being read. Archive titles end with the version label. Set `versioning.canonicalOrigin` to an origin to let each page declare its own canonical URL.

## Archiving a release

:::steps

1. Copy the current folder: `cp -R src/content/docs src/content/docs-v2`.
2. Fix absolute links in the snapshot (`/docs/…` becomes `/docs/v/2/…`).
3. Add `{ id: '2', label: 'v2', contentDirectory: 'docs-v2' }` to `archives`.
4. Build; every version is prerendered and the search index is rebuilt.

:::

`doq doctor` checks archive ids, overlapping folders and missing archive directories.
