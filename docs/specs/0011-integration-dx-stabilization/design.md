# Design — 0011 integration DX and stabilization

## Existing implementation

Binaries `doq-search` and `doq-api` live in `packages/doq/bin` as plain `.mjs` with `.d.mts` for programmatic entries. Showcases wire Doqs by hand. `scripts/consumer.ts` builds tarball consumers from showcase copies; `scripts/adoption.ts` builds the Angular Movement proof; `scripts/docs-check.ts` validates static output; `scripts/perf.ts` holds budgets. `apps/site` is a one-page Analog landing without Doqs.

## Proposed implementation

**CLI (`bin/doq.mjs`, `bin/cli/*.mjs`).** `args.mjs` (node:util `parseArgs`, typed options, exit 2), `source.mjs` (comment stripper that keeps string literals, identifier search, `resolveInside` with realpath check of the nearest existing ancestor, frontmatter reader), `project.mjs` (reads `package.json`, installed manifests, `vite.config.*`, TypeScript sources under `src`, stylesheets and `angular.json`; parses the paths module without running it and flags computed values), `semver.mjs` (`^ ~ >= || x` ranges), `init.mjs`, `doctor.mjs`, `node-support.mjs` (shared Node range guard used by all three binaries). No new dependency; `verify:package` asserts via `ts.preProcessFile` that CLI modules import only `node:` and local files.

_Init._ Plan every file first (`create`, `unchanged`, `kept`, `skipped`, `conflict`); a conflict cancels all writes; writes use the `wx` flag so a race cannot overwrite. Integration steps are derived from the project, not assumed: dependencies, stylesheet, providers (`doqRoutes`, `provideDoq`, `provideContent`, `withMarkdownRenderer`), prerender (`doqPrerenderRoutes` and `highlighter`) and the recommended deterministic plugin. Comments are stripped before searching so commented-out code does not count. The host files are never edited: structure differs per project and regex edits can corrupt source, so the CLI prints project-specific snippets (import path of the paths module computed relative to the located `provideFileRouter` file).

_Doctor._ Environment and peers come from real metadata in `node_modules` (the installed Doqs's own `peerDependencies`), content checks reuse the library's slug rule, versioning checks mirror `normalizeDoqVersioning` (overlap, ids, existing archive folders). Anything computed is `UNKNOWN`. Search checks run only when `search: { enabled: true }` is a literal in the sources. `--build` inspects an existing output (static HTML for each route, `pagefind/pagefind.js`).

**Official docs (`apps/site`).** `src/doq.paths.ts` + `src/content/docs/**` (18 pages). `docs.routes.ts` holds `doqRoutes()`, `provideContent()` and `provideDoq()` as route providers inside a lazy pathless route limited by `canMatch` to the mount segment (`app.config.ts`); nothing eager imports `@doqs/analog` because compiled Angular classes are not tree-shaken (measured: landing first-loaded JS 260,194 B eager vs 153,034 B lazy, 139,600 B before). `vite.config.ts` adds `content.highlighter`, `doqPrerenderRoutes`, `doqDeterministicMarkdown()`, a docs-aware sitemap (`src/lib/docs-routes.ts` uses `doqPrerenderRoute`), and `define: __DOQ_SITE_ORIGIN__`; canonical and `og:url` are written per route by `SeoLinks` (index.html's single canonical would have been wrong for every docs page). The skip link targets a `#content` wrapper: `docs:check` caught that `#main` did not exist on docs pages. Host theme tokens map `--host-docs-*` to Volt variables once in `styles.css`. Demos: `install-command` (new, Volt toggle group + copy) and `enter-animation` (existing, Angular Movement).

**Public API check (`scripts/public-api.ts`).** Reads the exported declarations of every `exports` entry syntactically (TypeScript parser, comments removed, `ɵ`/private/protected members dropped), writes `packages/doq/public-api.report.json`; compares with the committed report (any difference fails) and with `public-api.baseline.json` taken from the 0.7.0 tarball (removed export/member, retyped member or signature, new required interface member, removed binary fail; additions pass).

**Consumers.** `scripts/init-consumer.ts` builds a bare Analog host, installs the tarball like the docs say, asserts doctor FAILs with fixes, runs init (dry-run, real, rerun), applies the printed snippets, asserts doctor and init agree, builds and runs `doctor --build`. `adoption.ts` runs the same assertions on the real Angular Movement checkout in a separate `/handbook` region.

**Library CSS.** `.doq-toc` is anchored at `calc(var(--doq-content-width) + 2rem)` inside the article's reserved right column instead of `100% + 2rem` of a centered box.

## Tradeoffs and alternatives

Auto-editing `vite.config.ts` with an AST codemod (rejected: scope and risk, the printed snippets are verified by real builds); `api-extractor` (rejected: heavy, would not read Angular partial declarations better than the parser for this purpose); a commander/yargs CLI (rejected: `parseArgs` suffices).

## Security

The CLI never executes consumer code, never reads outside the project except `node_modules` manifests, never writes outside the project (realpath-checked), makes no network call, and has no dependencies.
