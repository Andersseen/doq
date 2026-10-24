---
title: Adopting Doqs in an existing library site
description: Replace the documentation infrastructure of a component-library website without changing its URLs, layout, demos or theme.
group: Guides
order: 20
---

A component-library site usually has more than documentation: a landing page, a demo gallery, tooling, its own header, theme and language switch. Doqs replaces the documentation part only. This guide is what two real adoption proofs (Angular Movement and Volt UI, built from the packed package) taught.

## Decide what Doqs owns

| Keep in the host | Give to Doqs |
| --- | --- |
| Landing page, demo gallery, playgrounds' wrapper components, tools such as a theme editor | Sidebar, table of contents, previous/next, search, code display, API reference tables, guides |
| Header, footer, theme switch, language switch | Markdown pages, generated API pages, source-backed examples |

Pages migrate one at a time. A page that has no Markdown file stays a host page.

## Keep your URLs

Give the Markdown file the path of the page it replaces, or set `slug:` in its frontmatter. Mount Doqs on the same prefix the site already uses and ask it to step aside for everything it has no document for:

```ts title=doq.config.ts
import { defineDoqConfig } from '@doqs/analog/config';

export const doqConfig = defineDoqConfig({
  contentDirectory: 'docs',
  basePath: '/docs',
  unmatched: 'continue',
  landmark: 'host',
});
```

With `unmatched: 'continue'` Doqs only claims a URL when a document exists for it. `/docs/introduction` keeps rendering your component, an unknown URL reaches your own 404, and the bare `/docs` stays yours. Without it (the default) Doqs claims everything below `basePath` and answers unknown pages with its own "not found" view.

### Order your routes

Analog registers extra routes before file routes, and each extra-route feature in the order you list it. Put Doqs first:

```ts title=app.config.ts
provideFileRouter(withExtraRoutes(doqRoutes(doqConfig)), withLocalizedRoutes());
```

Analog also turns every Markdown file under `src/content` into a route of its own. If something that matches every URL, such as a locale wrapper, comes before Doqs, that raw Markdown route answers the request and the page appears without Doqs's navigation.

## Own one `main` landmark

A page has exactly one `main`. If your shell already wraps the router outlet in `<main>`, set `landmark: 'host'`: Doqs renders plain containers and your shell stays the landmark. If your shell has no `main`, leave the default (`'document'`): Doqs renders it, and `DoqShellComponent` stops rendering its own. The choice comes from configuration, not from inspecting the page, so server-rendered HTML and the hydrated page agree.

If `provideDoq()` is scoped to a lazy route below your shell, the shell cannot see the configuration; pass `[mainLandmark]="false"` to `doq-shell` when Doqs owns the landmark.

## Import configuration without the UI

`@doqs/analog/config` exports `defineDoqConfig`, `provideDoq`, `doqPrerenderRoutes` and the configuration types, and imports only `@angular/core`. Use it in `vite.config.ts`, scripts and any eagerly loaded file. Importing the main entry in plain Node fails because it needs the Angular compiler; production browser bundles of a host that loads the documentation lazily were the same size with either entry in our measurement (`pnpm bundle:impact`).

## Interactive examples with your real components

Wrap the component in a small standalone component that exposes the inputs and outputs you want to control, then register it:

```ts
playgrounds: {
  'volt-button': {
    component: VoltButtonPlayground,
    controls: [{ input: 'variant', kind: 'select', label: 'Variant', initial: 'solid', options }],
    outputs: [{ event: 'pressed', label: 'Pressed' }],
  },
}
```

Doqs binds inputs by their public names and observes outputs; the wrapper is where a directive that plays once is re-created per setting, or where a `model()` becomes an output. Use `::demo[id]` for a component that needs no controls, such as a recipe.

## Theme tokens

Map your tokens once, globally:

```css
:root {
  --host-docs-background: var(--background);
  --host-docs-foreground: var(--foreground);
  --host-docs-primary: var(--primary);
  --host-docs-border: var(--border);
}
```

Dark mode follows whatever switches your tokens. Doqs derives text in the primary colour on tinted surfaces from a slightly darker mix, so a medium brand colour still reaches 4.5:1; set `--host-docs-primary-text` to choose it yourself.

## Know the limits

- **Overlays in the expanded preview.** The expanded view is a native modal `<dialog>` in the browser's top layer. Overlays your components append to `<body>` are not, so they can render beneath it. Use the inline preview for overlay components, or test yours first.
- **Localization.** Doqs has one content tree and English chrome. Pages you migrate lose their `/es` and `/uk` variants; keep localized pages as host pages until Doqs supports locales.
- **Search** indexes the prerendered Doqs pages only. Host pages are not in it.
