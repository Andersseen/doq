# Showcase B — ForgeCMS

The **docs-first** showcase: the whole application is documentation (a Starlight or ngDoc style site). Doqs is mounted at the application root with `basePath: '/'`, so the index is `/` and documents are `/concepts/models`, `/reference/api` and so on. The host contributes only `DoqShellComponent` (brand, header, footer), a theme toggle, `--host-docs-*` tokens, right-hand sidebar, custom slugs, slots and app-owned demos. Showcase A is the opposite scenario: a product site with Doqs mounted on a single `/docs` route.

Run from the monorepo root:

```sh
pnpm --filter showcase-b dev
pnpm --filter showcase-b build
pnpm --filter showcase-b preview
```

Markdown lives in `src/content/docs`. Analog prerenders the docs index and nested Markdown routes to `dist/analog/public`; the preview command serves those static files.
