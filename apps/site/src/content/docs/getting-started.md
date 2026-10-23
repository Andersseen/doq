---
title: Getting started
description: Add Markdown documentation to an existing Angular and Analog application in a few minutes.
group: Start here
order: 1
---

Doqs adds a documentation region to an Angular application that already uses [Analog](https://analogjs.org). Your header, footer, router, theme and components stay yours; Doqs supplies the Markdown routes, sidebar, table of contents and optional static search.

> [!NOTE]
> Doqs does not create an Angular project. Start from an Analog application (`npm create analog@latest`), then follow the steps below.

## Install the packages

Pick your package manager; the command is the same one the [installation page](/docs/installation) lists.

::demo[install-command]

## Quick path

:::steps

1. **Install** the packages above in your Analog application.

2. **Scaffold the documentation files** with the CLI that ships in the package. Nothing is overwritten; add `--dry-run` first to preview.

   ```bash
   pnpm exec doq init --dry-run
   pnpm exec doq init
   ```

3. **Connect what the CLI printed.** `doq init` creates `src/doq.paths.ts` and two Markdown pages, then lists the remaining edits to `vite.config.ts`, your Angular providers and your global stylesheet as exact snippets. See [Analog configuration](/docs/analog-configuration).

4. **Check the result and build.**

   ```bash
   pnpm exec doq doctor
   pnpm build
   ```

:::

`doq init` reports **Scaffold complete** when the files exist and **Integration complete** only when it can see every required connection in your project. They are different things: generated files do not render until the providers, prerender routes and stylesheet are connected.

## What you get

- Routes for every Markdown file below `src/content/docs`, mounted at `/docs` ([embedded](/docs/guides/embedded-documentation)) or at `/` ([docs-first](/docs/guides/docs-first-applications)).
- A sidebar grouped by frontmatter, a table of contents, previous and next links and a mobile drawer.
- Static prerendering through Analog, so every page ships as HTML and hydrates.
- Optional Pagefind search, versioned documentation, generated API reference pages and live Angular components inside Markdown. None of them is needed to display Markdown.

## Next steps

- [Installation](/docs/installation): packages, supported versions and optional dependencies.
- [The doq CLI](/docs/cli): `doq init` and `doq doctor` in detail.
- [Writing Markdown](/docs/guides/writing-markdown): frontmatter, groups, ordering and slugs.
