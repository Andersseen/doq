---
title: Routing and content
description: Add a Markdown page without hand-maintaining a navigation entry.
group: Guides
order: 7
---

## Add a document

Create a Markdown file under `src/content/docs`. Use nested folders to make nested routes:

```text
src/content/docs/
  guides/
    routing.md
  components/
    button.md
```

Each file's frontmatter supplies the visible title, description, and optional order or group. Analog's content API provides the body and attributes.

## Generated navigation

Doq reads the content file list with Analog's `injectContentFiles`, builds document links from file paths, and sorts them using `order` and title. The consumer does not maintain a second route registry.

Analog's route bridge is a normal file route at `src/app/pages/docs/[...slug].page.ts`; the host keeps all other filesystem routes.
