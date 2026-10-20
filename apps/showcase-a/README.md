# Showcase A — Vanta UI

The dark-first component-library host for the Doq pilot. It keeps its own compact Vanta header, footer, theme tokens, typography, left docs sidebar, TOC, and app-owned `vanta-button` Angular demo.

Run from the monorepo root:

```sh
pnpm --filter showcase-a dev
pnpm --filter showcase-a build
pnpm --filter showcase-a preview
```

Markdown lives in `src/content/docs`. Analog prerenders the docs index and nested Markdown routes to `dist/analog/public`; the preview command serves those static files.
