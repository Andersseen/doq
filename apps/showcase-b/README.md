# Showcase B — ForgeCMS

The light-first developer-platform host for Doq 0.1. It keeps a separate utility bar, ForgeCMS header and footer, theme tokens, typography, right docs sidebar, and app-owned `forge-schema` Angular demo.

Run from the monorepo root:

```sh
pnpm --filter showcase-b dev
pnpm --filter showcase-b build
pnpm --filter showcase-b preview
```

Markdown lives in `src/content/docs`. Analog prerenders the docs index and nested Markdown routes to `dist/analog/public`; the preview command serves those static files.
