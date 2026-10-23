---
title: Public API
description: The exports, binaries and styles of @doqs/analog, with their intended stability.
group: Reference
order: 31
---

Everything listed here is exported by the published package and covered by the automated public-API check, which compares the packed package's declarations with a committed report. "Stable intent" is the 1.0 plan; pre-1.0 releases may still adjust it, announced in the changelog.

## Configuration and routing

| Export | Kind | Intent |
| --- | --- | --- |
| `defineDoqConfig(config)` | function | Stable |
| `provideDoq(config)` | function | Stable |
| `doqRoutes(config)` | function | Stable |
| `doqPrerenderRoutes(paths)` | function | Stable |
| `DoqConfig`, `DoqPaths`, `DoqSlots`, `DoqPresentation`, `DoqDemoRegistry` | types | Stable |
| `DoqSearchConfig`, `DoqSearchResult` | types | Stable |
| `DoqVersioning`, `DoqVersionConfig`, `DoqArchiveConfig` | types | Stable |
| `DoqPlaygroundRegistry`, `DoqPlaygroundDefinition`, `DoqPlaygroundControl` (`DoqBooleanControl`, `DoqStringControl`, `DoqNumberControl`, `DoqSelectControl`, `DoqSelectOption`), `DoqPlaygroundOutput`, `DoqPlaygroundCode`, `DoqPreviewSize` | types | Stable (0.9) |
| `formatDoqUsage(selector, values, options?)` | function | Stable (0.9) |

## Components

| Export | Intent |
| --- | --- |
| `DoqDocsComponent`, `DoqIndexComponent` | Used through `doqRoutes()`; the class names are public, the selectors are not a contract |
| `DoqShellComponent` | Stable, optional |
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

## Binaries and styles

`doq` (init, doctor), `doq-search` (index), `doq-api` (generate, check), and `@doqs/analog/styles.css`.

## Source

The source, with type declarations next to it, is in [packages/doq](https://github.com/Andersseen/doqs/tree/main/packages/doq) of the repository, and the package is on [npm](https://www.npmjs.com/package/@doqs/analog).
