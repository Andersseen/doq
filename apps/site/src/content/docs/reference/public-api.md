---
title: Public API
description: The exports, binaries and styles of @doqs/analog, with their intended stability.
group: Reference
order: 31
---

Everything listed here is exported by the published package and covered by the automated public-API check, which compares the packed package's declarations with a committed report. "Stable intent" is the 1.0 plan; pre-1.0 releases may still adjust it, announced in the changelog.

## Import paths

| Path | Use |
| --- | --- |
| `@doqs/analog/config` | **Preferred for configuration**: `defineDoqConfig`, `provideDoq`, `doqPrerenderRoutes`, `DOQ_CONFIG` and the configuration types. Imports only `@angular/core`; safe in a `vite.config.ts`, a script or an eagerly loaded file |
| `@doqs/analog` | Angular UI and routing (`doqRoutes`, `DoqShellComponent`, …). Re-exports every configuration name for compatibility, so 0.10 imports keep working |
| `@doqs/analog/vite`, `/search-index`, `/api-reference`, `/content` | Node-only tooling; never import them from browser code |

## Stability tiers

Every export of the browser entries is classified in `packages/doq/public-api.stability.json`, and a test fails when an export has no tier:

- **Stable**: covered by SemVer at 1.0. The list in this page's tables plus `DoqLandmark`.
- **Advanced**: supported and documented (`DOQ_CONFIG`, the resolved-configuration types, `normalizeDoqPaths`, `DoqDocument`), may gain members.
- **Internal**: exported because Doqs's own entries or tests need it (parsers, patterns, catalog helpers). No guarantee; do not build on them.
- **Deprecated**: `DoqButtonDemoComponent`, an example of the pilot. It keeps working through 0.x and 1.x and is removed only in a major release. Register your own components with `DoqConfig.demos`.

After 1.0 breaking changes to stable and advanced exports happen only in a major release, deprecations live at least one minor, and the `config` entry keeps its current names.

## Configuration and routing

| Export | Kind | Intent |
| --- | --- | --- |
| `defineDoqConfig(config)` | function | Stable |
| `provideDoq(config)` | function | Stable |
| `doqRoutes(config)` | function | Stable |
| `doqPrerenderRoutes(paths)` | function | Stable |
| `DoqConfig`, `DoqPaths`, `DoqSlots`, `DoqPresentation`, `DoqDemoRegistry` | types | Stable |
| `DoqLandmark` and `DoqConfig.landmark` (`'document'` \| `'host'`) | type, option | Stable (0.11): who renders the page's `main` |
| `DoqUnmatched` and `DoqConfig.unmatched` (`'not-found'` \| `'continue'`) | type, option | Stable (0.11): whether host pages below the base path keep working |
| `DoqSearchConfig`, `DoqSearchResult` | types | Stable |
| `DoqVersioning`, `DoqVersionConfig`, `DoqArchiveConfig` | types | Stable |
| `DoqPlaygroundRegistry`, `DoqPlaygroundDefinition`, `DoqPlaygroundControl` (`DoqBooleanControl`, `DoqStringControl`, `DoqNumberControl`, `DoqSelectControl`, `DoqSelectOption`), `DoqPlaygroundOutput`, `DoqPlaygroundCode`, `DoqPreviewSize` | types | Stable (0.9) |
| `formatDoqUsage(selector, values, options?)` | function | Stable (0.9) |

## Components

| Export | Intent |
| --- | --- |
| `DoqDocsComponent`, `DoqIndexComponent` | Used through `doqRoutes()`; the class names are public, the selectors are not a contract |
| `DoqShellComponent` | Stable, optional. Renders a plain container when Doqs owns the `main` landmark; `[mainLandmark]` overrides it |
| `DoqPlaygroundComponent` | Rendered for `::playground[id]`; not for direct use |
| `DoqTabsComponent`, `DoqVersionSwitcherComponent` | Internal building blocks that are exported; not recommended for direct use |

## Helpers

Exported for tooling and tests, with weaker guarantees: `normalizeDoqPaths`, `doqPrerenderRoute`, `joinDoqPath`, `splitDoqInlineDemos`, `DOQ_INLINE_DEMO_PATTERN`, `parseDoqContent`, `parseDoqDocument`, `DOQ_INLINE_PLAYGROUND_PATTERN`, `DOQ_DEFAULT_PREVIEW_SIZES`, `DOQ_PLAYGROUND_EVENT_LIMIT`, `formatDoqEventPayload`, `validateDoqPlaygrounds`, `DOQ_CALLOUT_TYPES`, `normalizeDoqSearchConfig`, `normalizeSearchResultUrl`, `doqVersionLinks`, `DOQ_VERSION_FILTER` and the document helpers.

## Node-only entry points

Never import these in browser code.

| Import | Exports |
| --- | --- |
| `@doqs/analog/vite` | `doqDeterministicMarkdown(options?)` |
| `@doqs/analog/search-index` | `indexDoqSearch` |
| `@doqs/analog/api-reference` | `generateApiReference`, `checkApiReference`, `buildApiReference`, `DoqApiError` |
| `@doqs/analog/content` (0.10) | `generateContent`, `checkContent`, `buildContent`, `loadContentConfig`, `formatDiagnostic`, `doqContent`, `DoqContentError`, `EXIT_CODES`, `CONFIG_FILE`, and their option and result types (reference: [Content tooling API](/docs/reference/content-api)) |

## Binaries and styles

`doq` (init, doctor, content), `doq-search` (index), `doq-api` (generate, check), and `@doqs/analog/styles.css`.

## Source

The source, with type declarations next to it, is in [packages/doq](https://github.com/Andersseen/doqs/tree/main/packages/doq) of the repository, and the package is on [npm](https://www.npmjs.com/package/@doqs/analog).
