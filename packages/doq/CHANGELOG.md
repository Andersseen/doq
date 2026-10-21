# Changelog

## 0.1.0

First versioned release. Existing 0.0.0-pilot configuration keeps working.

### Added
- `doqPrerenderRoutes(paths)` — Analog `prerender.routes` entries (index + recursive content route with canonical slug transform) from one `{ contentDirectory, basePath }` object.
- `DoqPaths`, `normalizeDoqPaths()` and `defineDoqConfig()` — one shared, validated, build-safe path contract for Vite and Angular.
- `slots.indexAfterIntro` and `slots.documentAfterContent` — optional host-owned standalone components rendered with `NgComponentOutlet`.
- `presentation` — `documentationLabel`, `indexTitle`, `indexDescription`, `pageTitleSuffix`.
- Scoped page metadata: host title and description are captured (on the server and transferred to the client) and restored on leaving the docs; documents without a description no longer keep the previous document's; unknown docs routes get a `Page not found` title.
- `pnpm verify:package` (tarball and installed-consumer checks) and the `v01` browser check in `pnpm verify:mvp`.

### Changed
- The index and document components share one document catalog (`injectDoqDocuments`) instead of duplicating discovery.
- The docs index now sets the page title (previously left untouched).
- `contentDirectory` and `basePath` are normalized by `provideDoq()`.

### Unchanged
Routing, canonical and custom slugs, navigation order, heading IDs, mobile drawer, TOC, code copy and the demo registry.
