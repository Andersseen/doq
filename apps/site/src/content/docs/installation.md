---
title: Installation
description: Packages, peer dependencies and the supported environment for @doqs/analog.
group: Start here
order: 2
---

Doqs is published on npm as [`@doqs/analog`](https://www.npmjs.com/package/@doqs/analog). The source lives in [Andersseen/doqs](https://github.com/Andersseen/doqs).

## Packages

:::tabs Package manager

:::tab pnpm

```bash
pnpm add @doqs/analog @analogjs/content @analogjs/router prismjs
```

:::tab npm

```bash
npm install @doqs/analog @analogjs/content @analogjs/router prismjs
```

:::tab yarn

```bash
yarn add @doqs/analog @analogjs/content @analogjs/router prismjs
```

:::

`@analogjs/content`, `@analogjs/router` and `prismjs` are Analog's own requirements, not Doqs's: Doqs does not replace Analog's content or router. Your application also needs `@analogjs/platform` (the Vite plugin), which an Analog project already has.

## Optional packages

| Package | Needed for | How |
| --- | --- | --- |
| `pagefind` | [Full-text search](/docs/guides/navigation-and-search) | `devDependency`; the indexer runs after the build |
| `typescript` | [API reference generation](/docs/guides/api-reference) | The compiler your project already builds with |

Both are optional peer dependencies. An application that uses neither never installs them for Doqs.

## Supported environment

Doqs publishes its peer ranges in `package.json`, and `doq doctor` checks the versions actually installed in your project against them.

| Requirement | Range |
| --- | --- |
| Node.js | `^20.19.0 \|\| ^22.12.0 \|\| >=24.0.0` |
| Angular | `^21.2.2 \|\| ^22.0.0` |
| `@analogjs/content` | `^2.9.0` |
| TypeScript (only for `doq-api`) | `^5.5.0 \|\| ^6.0.0` |
| `pagefind` (only for search) | `^1.5.0` |

What was verified, and what was not, is on the [compatibility page](/docs/reference/migration-and-compatibility).

## Binaries and entry points

The package ships three command-line tools and four import paths:

- `doq`: [`init` and `doctor`](/docs/cli).
- `doq-search`: indexes the prerendered output with Pagefind.
- `doq-api`: generates [API reference pages](/docs/guides/api-reference).
- `@doqs/analog`: the Angular library (browser and server).
- `@doqs/analog/vite`, `@doqs/analog/search-index`, `@doqs/analog/api-reference`: Node-only helpers. Never import them from browser code.
- `@doqs/analog/styles.css`: the stylesheet.

The full list is on the [public API page](/docs/reference/public-api).
