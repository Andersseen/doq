---
title: Writing Markdown
description: Frontmatter, groups, ordering, nested folders and slugs.
group: Guides
order: 12
---

Documents are ordinary Markdown files below `src/content/<contentDirectory>`, rendered by Analog's content pipeline. Doqs reads their frontmatter to build routes and navigation.

## Frontmatter

```markdown
---
title: Button
description: Optional. Used for the page and the meta description.
group: Components
order: 2
slug: ui/button
demo: product-button
---
```

| Key | Default | Purpose |
| --- | --- | --- |
| `title` | the file name | Page heading, navigation label and document title |
| `description` | none | Introduction text and meta description |
| `group` | the folder, or `Guide` | Sidebar section |
| `order` | `100` | Sort position; ties sort by URL |
| `slug` | the file path | Replaces the whole path below the mount path |
| `demo` | none | A registered component appended to this document |

## Routes

Without a `slug`, `src/content/docs/guides/setup.md` is served at `/docs/guides/setup`, and `index.md` represents its folder. Slug segments may contain letters, numbers, `_`, `-` and `~`.

Invalid slugs and two documents on one URL fail with a diagnostic naming the files. `pnpm exec doq doctor` finds them before a build does.

## Headings and the table of contents

Use one `##` per section; the page's `<h1>` comes from `title`. The table of contents lists the headings, and a link such as `/docs/installation#packages` scrolls to its heading once the page has rendered. Repeated heading text gets numeric suffixes (`usage`, `usage-1`); the [deterministic plugin](/docs/operations/deterministic-vite-plugin) keeps those suffixes stable between builds.

## Links

Link to other documents with absolute site paths: `[Installation](/docs/installation)`. Links are normal anchors, and every target is a prerendered page.

## Code

Fenced blocks are highlighted by Analog and get a language label and a copy button. For a caption or tabbed variants, see [Rich Markdown](/docs/guides/rich-markdown).
