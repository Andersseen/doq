# 0008 — Angular API reference generation

## Problem

Doqs 0.4 lets authors write guides, tutorials and interactive examples. The reference part of a library's documentation is still typed by hand: Angular Movement, the reference consumer, keeps an "API stability" table and per-directive input tables in Angular pages although every input, output, selector and stability tag already exists in its TypeScript source (`MoveEnterDirective` alone has six signal inputs, two of them with transforms). Hand-kept tables drift from the code, and a library cannot tell in CI that its published reference is stale.

Doqs needs a **build-time, source-driven API reference**: read the real public declarations, write ordinary Doqs Markdown, and let the existing Analog, routing, Pagefind and navigation pipeline do the rest.

A release defect was found while inspecting the state of 0.4: `@doqs/analog@0.4.0` was published at 09:51 UTC on 2026-10-22 but the npm registry listed it only at 09:57; the release workflow's `verify-published` step gave up after two minutes, so the GitHub Release `v0.4.0` was never created.

## Consumer impact

Additive and opt-in. Nothing changes for a project that does not run `doq-api`. A project that does gets a new CLI (`doq-api generate` / `doq-api check`), a Node-only entry (`@doqs/analog/api-reference`) and an optional `typescript` peer. Generated pages are normal Markdown files below the content directory; the browser bundle gains nothing. Package version `0.5.0`.

## Scope

- A Node-only generator (`packages/doq/bin/api-reference*`, CLI `doq-api`) that resolves a library entry point with the **consumer's** TypeScript, discovers public exports through the type checker, extracts Angular metadata statically, and renders deterministic Markdown.
- Safe ownership of generated files (manifest, conflict detection, no deletion of anything not generated) and a non-mutating `check` mode for CI.
- Showcase A (embedded at `/docs`): a small standalone Angular fixture (`apps/showcase-a/vanta-ui`) and its generated reference linked from a guide. Showcase B (docs-first at `/`): a non-Angular developer-platform SDK fixture (`apps/showcase-b/forge-sdk`).
- Proof against the real Angular Movement public entry point in the disposable adoption checkout, including a stale-reference failure.
- The packed `0.5.0` tarball verified in independent consumers.
- Release automation: the registry-visibility window of `verify-published` (regression test).
- Documentation, changelog, website copy.

## Non-goals

A TypeDoc replacement, an Angular language server, browser-side source analysis, API versioning, a documentation editor, MDX, template compilation, changelog generation, semantic API diffing, version bumping from API changes, LLM-written descriptions, a hosted backend or symbol database, running consumer code, a second search engine or theme engine, new CI or release infrastructure, any change to the Angular Movement repository, any publication or deployment from this branch.

## Requirements

- **REQ-001** `doq-api` (bin) and `@doqs/analog/api-reference` (Node-only entry with `.d.mts` declarations) ship in the tarball. TypeScript is resolved from the consumer project (walking up `node_modules`, never from Doqs), is an optional peer, and no browser bundle or browser declaration contains compiler code or a Node import.
- **REQ-002** Public API discovery uses the compiler's checker on one program per run: direct exports, `export *`, named and renamed re-exports, type-only exports, barrels and aliases are followed; a symbol exported under several names is documented once with its other names listed; unexported symbols, `@internal`/`@ignore` symbols, re-exports from external packages, namespaces and `default` are excluded (with diagnostics), as are private, protected, `#private` and `@internal` members.
- **REQ-003** `@Component`, `@Directive`, `@Pipe` and `@Injectable` classes are recognised (only when the decorator resolves to `@angular/core`); selector, `exportAs`, pipe name and `providedIn` are read statically (literals and `const` references the checker can resolve). Anything computed produces a warning and is omitted, never guessed. Lifecycle hooks and DI/query fields are not documented as API.
- **REQ-004** Signal `input()`, `input.required()`, `model()` and `output()` are extracted with property name, public (aliased) binding name, required flag, default, description, and — for transformed inputs — both the accepted binding type and the type the signal reads, plus the transform. A model lists its `<name>Change` output once and the change output is not repeated under Outputs. Only functions that resolve to `@angular/core` count.
- **REQ-005** Decorator `@Input()` (bare, alias string, `{ alias, required, transform }`, setters) and `@Output()` (bare, alias, `EventEmitter<T>` payload) are extracted with the same fields.
- **REQ-006** Exported functions (every overload), arrow-function constants, interfaces, type aliases, enums, classes and constants are documented with readable signatures that keep generic names, optionality, rest parameters, readonly arrays and unions, without absolute paths or `import("…")` noise and without recursive expansion; long constant types are shortened with a diagnostic; names of other documented symbols link to their pages.
- **REQ-007** JSDoc: description, `@param`, `@returns`, `@example`, `@deprecated`, `@since`, `@see`, `@stability`, `@experimental` and `{@link}` are preserved; missing documentation yields a signature-only page and no invented stability; deprecation text is kept; prose cannot inject raw HTML, Doq directives (`:::`, `::demo[…]`) or table breakage.
- **REQ-008** Output is Doqs Markdown: valid frontmatter (`title`, `description`, `group`, `order`, `generated`, `category`), one index page, one page per symbol with only the sections that have content (Overview, Selector, Inputs, Models, Outputs, Public methods, Properties, Signature(s), Declaration/Definition, Members, Related types, Examples, See also), tables and fenced code only, rich callouts for deprecation; slugs derived from names, with deterministic collision handling. The canonical URL is the file path below `basePath`.
- **REQ-009** Output is deterministic: stable symbol, member, file, slug and heading order; locale-independent sorting; no timestamps, random ids or absolute paths; LF newlines and a final newline; two runs are byte-identical.
- **REQ-010** Generation writes only inside the explicit `--out` directory, which must be a sub-directory of the content directory inside the project (no `..`, no `node_modules`/`.git`, no symlink leaving the project). A manifest records the generated files and their hashes. Existing unmanaged files, hand-edited generated files and damaged manifests abort the run before anything is written; obsolete files are removed only when unchanged since generation; hand-written siblings are never touched.
- **REQ-011** `doq-api check` computes the expected output and exits 0 only when files, content and manifest match; otherwise it exits 1 naming added, modified and removed files (and conflicts). It never writes.
- **REQ-012** Invalid input yields a one-line, actionable `doq-api:` diagnostic and a distinct exit code (2 for usage/configuration, 1 for a failed run): missing entry or TypeScript, unreadable project, non-module entry, unsafe output, unknown categories, bad `--source-url`, empty selection. `--strict` fails on warnings and on undocumented public symbols.
- **REQ-013** Showcase A documents a real standalone component (`VantaAlertComponent`: required, optional, aliased and transformed inputs, an output, a public method, a JSDoc example) and a directive with a model, is linked from a hand-written guide, and works embedded at `/docs` (navigation, search, TOC, highlighting, prerendering, client navigation).
- **REQ-014** Showcase B documents a non-Angular SDK (client interface, functions with overloads, type aliases, an enum, a configuration helper) at root-mounted nested routes with canonical links, keeping its host styling and right sidebar.
- **REQ-015** Generated pages are ordinary documents: prerendered with correct metadata and heading ids, in the table of contents, indexed by Pagefind (symbol names, input names, selectors) at their canonical routes, hydrating without console errors, coexisting with rich Markdown and inline demos, readable at 375 px.
- **REQ-016** Against a disposable checkout of the real Angular Movement, the generator extracts `MoveEnterDirective`, `MoveDragDirective`, `provideMovement` and their types from `public-api.ts`; the page metadata equals the source declarations; the pages are prerendered, routable, searchable and accessible in the host's theme; a public-API change makes `check` fail until `generate` is run. The Angular Movement repository is not modified.
- **REQ-017** The packed tarball, installed outside the monorepo (no `workspace:`), resolves the consumer's TypeScript, generates, checks, prerenders, indexes and serves reference pages, for a prefixed mount and a root mount.
- **REQ-018** Release: package version `0.5.0`; changelog; tarball validated; Trusted Publishing untouched; `verify-published` waits long enough for npm's registry (regression test, ≥ 10 minutes); publication is reported separately from readiness.
- **REQ-019** README, package README, changelog, operations notes and the official website describe the feature accurately (CLI example, limits, TypeScript requirement).
- **REQ-020** Performance and compatibility are measured and recorded: one program per run, generation time for the Angular Movement entry, output size, tarball size, browser bundle unchanged; works with TypeScript 5.9 (repository) and 6.0 (Angular Movement).

## Acceptance cases

- **AC-001** [REQ-002] Unit cases with real compiler programs for barrels, `export *`, renamed and type-only re-exports, two names for one symbol, external re-exports, namespaces, `@internal`, and private/protected/`#private` members.
- **AC-002** [REQ-003] Unit cases: component selector from a `const`, directive with a selector list, pipe name and overloads, injectable `providedIn`, computed selector warns and is omitted, decorators not from Angular are ignored.
- **AC-003** [REQ-004] Unit cases: required, default, alias, transform with distinct accepted/read types, model with change output not duplicated, output alias and payload, same-named non-Angular `input` ignored.
- **AC-004** [REQ-005] Unit cases: `@Input()`, `@Input('alias')`, `@Input({ required, transform })`, `@Output()`, `@Output('alias')` with `EventEmitter<T>`.
- **AC-005** [REQ-006] Unit cases: overloads, generics, rest parameters, interfaces with optional/readonly members, object aliases, union aliases, enums, arrow functions, constants; no `import(` or absolute path in any model.
- **AC-006** [REQ-007] Unit cases: tags, undocumented symbol without stability, deprecation text, HTML/`:::`/`::demo` neutralised, `{@link}` resolved, table-cell pipes escaped, fenced examples kept.
- **AC-007** [REQ-008, REQ-009] Unit cases: frontmatter, sections present and absent, include/exclude, base path, source links, slug collisions, repeated generation byte-identical.
- **AC-008** [REQ-010] Unit cases: unsafe output paths, symlink escape, unmanaged conflict aborts without writes, hand-edited page, obsolete file removal, hand-written siblings untouched, damaged manifest.
- **AC-009** [REQ-011, REQ-012] Unit cases: check reports added/modified/removed and never writes; strict mode; configuration errors; CLI exit codes through the packed binary.
- **AC-010** [REQ-001] Contract: tarball contents, exports map, bin, optional peer, no TypeScript or Node import in the browser bundle or declarations.
- **AC-011** [REQ-013, REQ-014, REQ-015] Contract: generated Markdown frontmatter, prerendered pages, HTTP status, Pagefind fragments of symbol and input names, determinism of the committed output (`doq-api check`).
- **AC-012** [REQ-013, REQ-015] Playwright on production builds of Showcase A: open a directive/component reference, selector, required inputs and aliases, outputs and payloads, navigate from a guide, search for a symbol and for an input, TOC, copy, reload a nested route, mobile navigation, no console errors.
- **AC-013** [REQ-014, REQ-015] Playwright on Showcase B: root-mounted function reference, type and enum pages, canonical cross-links, search, right sidebar, reload.
- **AC-014** [REQ-016] `pnpm verify:adoption`: reference generated from the real checkout; extracted inputs/outputs compared with the source declarations; pages prerendered, searched, accessible; a changed public signature fails `check` until regenerated.
- **AC-015** [REQ-017] `pnpm consumer:build` and the E2E consumer specs: tarball installed outside the monorepo, generation and check through the installed binary, both mounts.
- **AC-016** [REQ-018] `UNIT-100` and workflow assertions; `pnpm verify:package`; npm registry state recorded separately.
- **AC-017** [REQ-019] Docs and site exist and agree with behaviour; `pnpm sdd:check`, site component test.
- **AC-018** [REQ-020] Timings, sizes and TypeScript 6 run recorded in `verification.md`.

## Public API impact

Additive. New CLI `doq-api`; new Node-only export `@doqs/analog/api-reference` (`buildApiReference`, `generateApiReference`, `checkApiReference`, `DoqApiError`, option and result types); new optional peer `typescript` (`^5.5.0 || ^6.0.0`). New frontmatter keys written by the generator (`generated`, `category`) are ignored by the runtime. No change to `provideDoq`, `defineDoqConfig`, `doqRoutes`, `doqPrerenderRoutes`, `DoqConfig`, `::demo[id]`, the rich Markdown syntax, search configuration, host slots or CSS tokens; the Angular entry point does not import Node or TypeScript.

## Compatibility

Angular 21.2 / Analog 2.9 unchanged; no Angular peer range was widened. Node `^20.19.0 || ^22.12.0 || >=24.0.0` (the generator uses `node:util` `parseArgs` and ESM). TypeScript 5.9 (this repository) and 6.0 (Angular Movement) via documented compiler APIs only. Generated pages degrade to readable Markdown anywhere; Doqs renders them with its existing pipeline and Pagefind policy.
