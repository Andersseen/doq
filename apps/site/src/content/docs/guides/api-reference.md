---
title: Angular API reference
description: Generate reference pages from your library's public TypeScript API with doq-api.
group: Guides
order: 17
---

`doq-api` reads the public API of your library with **your** TypeScript compiler and writes ordinary Doqs Markdown pages: an index plus one page per public symbol. They share the routing, table of contents, theme and search of your hand-written guides.

```bash
pnpm add -D typescript
pnpm exec doq-api generate \
  --project projects/lib/tsconfig.lib.json \
  --entry projects/lib/src/public-api.ts \
  --out src/content/docs/reference/generated
pnpm exec doq-api check <same flags>
```

Run `generate` when the public API changes and commit the pages. Run `check` in CI: it exits `1` when the committed pages are stale. Output is deterministic (no timestamps, no absolute paths).

| Flag | Default | Purpose |
| --- | --- | --- |
| `--entry` | required | The public entry point; only what it exports is documented |
| `--project` | built-in options | tsconfig used to resolve imports |
| `--out` | `src/content/docs/reference/generated` | Output folder, inside the content folder |
| `--content-dir` | `src/content/docs` | Your content folder |
| `--base-path` | `/docs` | Your mount path, for cross-links |
| `--strict` | off | Fail on warnings and undocumented public symbols |

## What is extracted

- The public API only, followed through barrels and re-exports.
- Angular components, directives, pipes and services, including signal inputs, models, outputs and their legacy decorator forms.
- Functions, classes, interfaces, type aliases, enums and constants, with JSDoc (`@param`, `@returns`, `@example`, `@deprecated`, `@see`, `{@link}`).
- Computed metadata is reported as a warning and left out; code is never executed.

## Safe ownership

Pages are written only below `--out`. A `.doq-api.json` manifest records every generated file and its hash. A file the generator did not create, an edited generated page or a damaged manifest stops `generate` before anything is written. Hand-written siblings are never touched.

The Node-only functions are exported from `@doqs/analog/api-reference`; never import them in browser code. Reference pages for [a versioned layout](/docs/guides/versioned-documentation) use `--content-dir`, `--out` and `--base-path` per version.
