---
title: Navigation
description: Help people understand where they are and what they can do next.
group: Components
order: 5
---

## Navigation hierarchy

Reserve global navigation for the product's main areas. A local sidebar can expose a documentation tree without replacing the host header.

The documentation links, active-route state, previous and next links, and breadcrumbs are derived from Markdown files and frontmatter.

## Link labels

Write labels that make sense out of context. Prefer **Component overview** over *Read more*.

## Route changes

Analog's router owns page transitions and deep links. The Doq UI uses ordinary Angular router links, so refresh and browser history stay consistent with the host application.
