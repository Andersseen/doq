# Doq

Doq (`@doqs/analog`, **0.2.0**) adds Markdown documentation to an existing Angular/Analog.js application. The host keeps its header, footer, routes, theme and components; Doq supplies documentation routing, navigation, table of contents, index, code blocks, optional static full-text search (Pagefind, no backend) and a small set of composition points. Integration guide, configuration reference and defaults: [packages/doq/README.md](packages/doq/README.md). Release notes: [packages/doq/CHANGELOG.md](packages/doq/CHANGELOG.md). Not yet published to npm.

```ts
// vite.config.ts                         // app.config.ts
prerender: { routes: async () =>          const doqConfig = defineDoqConfig({
  ['/', ...doqPrerenderRoutes(doqPaths)]    ...doqPaths, slots: { ... }, presentation: { ... },
}                                         });
```

## Workspace

- `packages/doq` — the Angular library (ng-packagr, partial compilation).
- `apps/showcase-a` — dark-first component-library host (Vanta UI): left sidebar, TOC, its own button demo, a getting-started callout on the index and a help footer on every document.
- `apps/showcase-b` — light-first developer-platform host (ForgeCMS): right sidebar, no TOC, custom nested slug, its own schema demo, an onboarding-path banner on the index and an API-token note on every document.
- Each showcase has its own `src/doq.paths.ts`, shell, content, demos and slot components; they share only the Doq package.

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and the pre-PR checklist. Tested with Node 22.23.1, pnpm 10.18.3, Analog 2.9, Angular 21.2.x, TypeScript 5.9.3, Vite 8.

```sh
pnpm install
pnpm dev:a        # or dev:b
pnpm build
pnpm pack:doq     # artifacts/doqs-analog-<version>.tgz; does not publish
pnpm verify:mvp   # browser acceptance (M9, M15–M17, M23, M24) plus the 0.1 check V01
pnpm verify:package artifacts/doqs-analog-<version>.tgz [consumer-dir]
pnpm typecheck:scripts && pnpm format:check
pnpm test:unit && pnpm test:components   # Vitest + Angular Testing Library
pnpm test:e2e && pnpm test:contract      # Playwright and pytest
pnpm verify:change                       # fast local gate; pnpm quality:gate is the full pre-PR gate
```

Both showcases enable search: their `build` script runs `vite build && doq-search index dist/analog/public` (Showcase B also builds a search-disabled variant into `dist/analog-nosearch` for tests). `pnpm --filter showcase-a preview` / `showcase-b preview` serve the generated `dist/analog/public`; the preview server maps `index.html` files to deep URLs and returns 404 for missing files. Production hosts should configure their own 404 behavior.

## License and community

MIT, see [LICENSE](LICENSE). [Contributing](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [Security](SECURITY.md) · [Support](SUPPORT.md) · [Specifications](docs/specs/README.md).

## Verification

[scripts/verification](scripts/verification/README.md) documents the harness. Historical evidence for the 0.0.0-pilot MVP: [docs/verification/mvp-final-validation.md](docs/verification/mvp-final-validation.md). 0.1.0 evidence: [docs/verification/0.1.0-validation.md](docs/verification/0.1.0-validation.md).
