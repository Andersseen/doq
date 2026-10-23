---
title: The deterministic Vite plugin
description: Why doqDeterministicMarkdown() exists, how to add it and how to verify heading ids.
group: Operations
order: 20
---

`doqDeterministicMarkdown()` contains an upstream concurrency problem. It does not fix it, and it is not a Doqs bug.

## The problem

`@analogjs/platform` renders each Markdown file in a Vite `load` hook, and Vite runs those hooks concurrently. Every render shares one `marked` instance, and `marked-gfm-heading-id` keeps its slugger in module state. With an asynchronous step such as Shiki, two files interleave and receive each other's duplicate-heading suffixes: `usage-2` where `usage-1` belongs.

The ids are baked into the bundle, so the prerendered HTML, the table of contents and the search anchors disagree, and the next build may differ. The reproduction is in the repository at `docs/repro/heading-id-concurrency.mjs`. It was observed with `@analogjs/platform` 2.9.x and `marked-gfm-heading-id` 4.1.4.

## The fix in your project

```ts
import { doqDeterministicMarkdown } from '@doqs/analog/vite';

export default defineConfig({
  plugins: [analog({ ssr: true, static: true, content: { highlighter: 'prism' } }), doqDeterministicMarkdown()],
});
```

The plugin runs Analog's own Markdown `load` hook for one file at a time, in the order Vite requests the files. Nothing is patched or copied, and the output equals a sequential build. Place it anywhere in `plugins`.

> [!IMPORTANT]
> It throws at config time when no `analogjs-content-file` plugin is found. Add it after `analog()`, or remove it if the project does not render Markdown through `@analogjs/platform`. If Analog renames its plugin, pass `{ contentPlugin: 'new-name' }`.

It is opt-in because Doqs cannot edit your Vite configuration. `doq init` lists it as a recommended step and `doq doctor` warns when it is missing.

## Symptoms

- A fragment link scrolls nowhere.
- The table of contents and the page disagree.
- A search result opens the wrong place.
- `usage-2` exists on a page with only two `Usage` headings.

Add the plugin and rebuild. Do not accept "rebuild until it passes".

## Verify a build

The Doqs repository ships `pnpm docs:check`, which compares every page's heading ids with `github-slugger` applied in order and checks routes, table-of-contents fragments and same-site links offline. It runs in CI after the build.
