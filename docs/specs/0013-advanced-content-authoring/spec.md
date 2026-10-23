# 0013 — advanced content authoring

## Problem

Documentation examples are pasted into Markdown. They go stale when the API changes, may no longer compile, the same installation notes are copied between pages, and hand-written guides link generated API pages by URLs the author must remember (and that differ between documentation versions). Doqs renders and searches documentation well (0.1–0.9) but offers no way to keep Markdown connected to the real source of the library it documents.

At the start of this work `main` was `d2b984b` (0.9.0 merged); `npm view @doqs/analog` still answered 0.7.0, so 0.8.0 and 0.9.0 were unpublished and the CI run for 0.9 on `main` was in progress.

## Consumer impact

An author writes pages in a separate authoring directory using three line-level directives and runs `doq content generate`: `::source{file, region|lines}` shows code read from a real file, `::include{file}` reuses a Markdown fragment and `[[api:Name]]` links a public symbol's generated API page. The output is ordinary Markdown in the content directory, rendered by Analog and Doqs exactly like hand-written pages. Projects that do not opt in need no file, no step and no configuration; every 0.9 configuration builds and renders unchanged.

## Scope

- `@doqs/analog/content` and `doq content generate|check|watch`: Node-only authoring processor, `doq.content.json` (one target per documentation version), ownership manifest, diagnostics with exit codes, `doqContent()` Vite plugin.
- `doq-api` records a symbol → route index (`symbols`) in its manifest; it documents an entry that is itself a declaration file.
- Fixtures and evidence: Showcase A (embedded, with a Volt UI playground next to its source), Showcase B (docs-first, nested routes), both archives, the official documentation (guides plus a generated API reference of the content tooling), the Angular Movement adoption proof, tarball consumers with and without authoring.
- Version 0.10.0, budgets, public API report, README, changelog, 1.0 readiness.

## Non-goals

MDX, JSX, a second Markdown parser, runtime or browser-side processing, executing or compiling source files, fetching source or old tags, inline Angular templates in Markdown, a component import syntax, rewriting heading levels or links in fragments, automatic backfilling of unpublished releases, publishing from the feature branch.

## Requirements

- **REQ-001** `::source{file="…"}` on a line of its own is replaced by an ordinary fenced code block holding the text of a project file, with the language inferred from the extension (or `lang`), an optional `title` (rendered by the existing `:::code` block) and the existing highlighting and copy control.
- **REQ-002** `region="name"` extracts a `doqs:`-prefixed region (`//`, `#`, `/* */`, `<!-- -->` markers; nesting allowed; markers excluded; indentation kept relative); missing, duplicate, unterminated, misnested and empty regions fail with actionable diagnostics; the source file is never modified.
- **REQ-003** `lines="a-b"` extracts a line range; whole files are supported; line endings and a BOM are normalised.
- **REQ-004** A source file is read only if its real path is inside a configured `sourceRoots` directory, it is a regular UTF-8 text file of a supported type below 256 KiB, and it is not under `node_modules`/`.git`/build output or named like an environment, key or credential file; traversal, absolute paths, URLs, symbolic-link escapes, directories, binaries and oversized files are rejected; nothing is executed or fetched; there is no option that disables this.
- **REQ-005** When a target sets `sourceUrl`, a block gets a "View source" link with `{path}`, `{revision}` and `{lines}` filled from configuration; without it, or with `link="false"`, there is no link; nothing is guessed.
- **REQ-006** `::include{file="…"}` inserts the text of a Markdown fragment (a file or directory name starting with `_`, inside the authoring directory), `/x` relative to the authoring root and other paths relative to the including file.
- **REQ-007** Includes nest up to five levels, cycles are detected, a fragment may not have frontmatter, heading levels and links are not rewritten, fragments never become pages or routes, and a missing, non-`.md`, page-like or escaping include fails safely.
- **REQ-008** Directives inside code fences, inline code, block quotes, lists and mid-paragraph stay literal; inserted source is never rescanned; `::demo[id]`, `::playground[id]`, tabs, steps and callouts around or inside fragments behave as if typed directly.
- **REQ-009** `doq-api` writes a deterministic `symbols` index (export name → route, using the generator's own slugs, collisions and `--base-path`) into its owned manifest; `check` validates it; older manifests are reported stale; a declaration-file entry can be documented.
- **REQ-010** `[[api:Name]]`, `[[api:Name|Label]]` and `[[api:Name@target]]` become ordinary links with an escaped label; unknown, case-mismatched, ambiguous, malformed and unconfigured references fail with a diagnostic and never invent a URL.
- **REQ-011** Each target resolves API links against its own index: an archived guide links the archived reference by default, a symbol missing there is an error, and a cross-version link needs an explicit `@target`.
- **REQ-012** `doq content generate|check|watch` and `@doqs/analog/content` are Node-only, import only Node built-ins and the package's own modules, ship in the tarball with strict declarations, work from the packed installation with explicit `--dir`/`--config`, and do not enter the Angular entry or any browser bundle.
- **REQ-013** Generated pages are owned: a manifest with SHA-256 hashes lives in the authoring directory; hand-written or edited files are conflicts and are never overwritten or deleted; `check` writes nothing; stale files are reported; output is deterministic (no timestamps, no machine paths, stable order).
- **REQ-014** The content is resolved before the Analog build: `doqContent()` resolves on build start and re-resolves on change with Vite's watcher, `watch` does so without Vite, and the repository gates run `content:check`; `doqDeterministicMarkdown()` is unchanged.
- **REQ-015** Diagnostics carry page, line, directive, reference, reason and fix, are reported together, nothing is written when any exists, and exit codes distinguish stale (1), configuration (2), conflict (3) and invalid authoring (4).
- **REQ-016** Source text, labels and titles cannot inject HTML, Markdown structure, fences or directives into the generated page.
- **REQ-017** Generated pages prerender and hydrate like hand-written ones: heading ids, TOC, canonical URLs, 404s and search are correct, no authoring syntax reaches the HTML, and the playground chrome stays out of the index.
- **REQ-018** The public API is additive (`verify:public-api` against the 0.7.0 baseline), existing consumers need no change, and the manifests of `doq-api` stay valid for tools that ignore `symbols`.
- **REQ-019** The feature works for real consumers: Showcase A and B (current and archived), the official documentation, the Angular Movement checkout and tarball-installed Angular 21 and 22 consumers, and a consumer without authoring.
- **REQ-020** No new dependency and no new browser JavaScript; stylesheet and initial-JavaScript budgets are not raised; content-proportional budgets are raised only for measured added pages.
- **REQ-021** The package is prepared as 0.10.0, release automation is unchanged (Trusted Publishing, no token), and publication and deployment status are reported from the registry and the workflows, not inferred.

## Acceptance cases

<!-- Format: - **AC-001** [REQ-001] observable behavior that proves the requirement. -->

- **AC-001** [REQ-001] A page with `::source{file="lib/movement.ts" region="basic" title="movement.ts"}` generates `:::code movement.ts` followed by a ` ```ts ` block with the region text; whole files, `.scss`, `.sh`, `.json` and an explicit `lang` work; the production page shows the highlighted code with a copy button.
- **AC-002** [REQ-002] Nested regions keep or drop inner markers correctly; HTML, CSS and shell markers work; editor `#region` markers without `doqs:` are plain code; each broken region fails with the available region names or the line of the broken marker; the source file is byte-identical afterwards.
- **AC-003** [REQ-003] `lines="2-3"` returns exactly those lines, an out-of-range request fails, CRLF and a BOM disappear, relative indentation survives.
- **AC-004** [REQ-004] Fifteen negative controls (traversal, absolute path, URL, `.env`, key, credential name, `node_modules`, binary, oversized, directory, unknown type, symlink escape to a file and to a directory, a source root that is a symlink or the project, a file outside the roots) are rejected as `unsafe-path` without leaking the content; a symlink that stays inside the roots is accepted.
- **AC-005** [REQ-005] With `sourceUrl`/`revision`/`sourcePathPrefix` the link ends with `#L4-L8` for the region; without configuration there is none; `link="false"` hides it; a `{revision}` template without a revision is a configuration error.
- **AC-006** [REQ-006] A fragment included by an absolute-from-root path and by a relative path appears in place and still receives the directives it contains.
- **AC-007** [REQ-007] A cycle names `_a.md -> _b.md -> _a.md`, depth six fails, frontmatter, a page target, a `.txt` target and `..` escapes fail, fragments and dotfiles are not emitted as pages, and a symbolic link in the authoring directory is reported.
- **AC-008** [REQ-008] Directives in a fence, inline code, quote and mid-line stay literal; a snippet containing a four-backtick fence, `::playground[x]`, `[[api:Nope]]` and `<script>` is wrapped in a longer fence and produces no diagnostic; a fragment with `::playground` and `::demo` inside a tab body is emitted unchanged.
- **AC-009** [REQ-009] After `doq-api generate --base-path /docs/v/2` the manifest `symbols` map each export to `/docs/v/2/reference/api/<slug>`, sorted, without machine paths; `check` passes, fails after a hand edit and regenerating restores identical bytes; a `.d.mts` entry yields pages.
- **AC-010** [REQ-010] A symbol becomes ``[`Name`](route)``, a label is escaped (`<img onerror>` becomes inert), `` `[[api:X]]` `` stays literal, and unknown, `movedirective`, two indexes with one name, `[[api:bad name]]` and a missing index each produce the right diagnostic kind.
- **AC-011** [REQ-011] With two targets, the archived guide links `/docs/v/1/reference/generated/…`, a current-only symbol is an error in the archive, and `@current` is rejected unless configured; in the production builds of both showcases the archived link answers 200 and stays under `/v/1`.
- **AC-012** [REQ-012] `verify:package` and CONTRACT-105 show the exports map, the files, strict declarations, only Node and relative imports and no authoring code in `fesm2022` or any client bundle; the packed CLI runs `generate`/`check` outside the repository.
- **AC-013** [REQ-013] Generating twice is byte-identical; `check` leaves a snapshot of the project unchanged; an existing hand-written page, an edited generated page, a corrupt manifest, a link as output directory and overlapping directories are refused without changing anything; stale outputs are removed only when unmodified and non-empty directories stay.
- **AC-014** [REQ-014] Showcase A builds with `doqContent()` and without a pre-generated file; the tarball consumer proves check → stale → generate → up to date; `pnpm content:check` is part of `verify:change`; `perf`/determinism gates are unchanged.
- **AC-015** [REQ-015] One report lists page, line, directive, reference, message and fix for every problem, sorted by line; the packed CLI exits 4 for invalid authoring, 3 for conflicts, 2 for configuration, 1 for stale output; nothing is written on failure.
- **AC-016** [REQ-016] Hostile source, labels and titles (backticks, `::demo`, `<script>`, control characters, brackets) produce inert Markdown and, in the production HTML, no executable markup.
- **AC-017** [REQ-017] The guide pages exist at canonical URLs, hydrate without console errors, have deterministic heading ids and TOC entries, are found by Pagefind at their canonical route, an unknown nested route is 404, and the HTML contains no `::source`, `::include`, `[[api:` or "not resolved".
- **AC-018** [REQ-018] `pnpm verify:public-api` passes against the 0.7.0 baseline and the report lists only additions; `.doq-api.json` keeps `generator` and `files`.
- **AC-019** [REQ-019] AUTHOR-001..020 pass on the production builds, AUTHOR-021 on the Angular Movement checkout, the tarball consumers build with and without authoring on Angular 21 and 22.
- **AC-020** [REQ-020] The packed manifest depends only on `tslib`; `perf:check` passes with each raised content metric justified and initial JavaScript and CSS budgets unchanged.
- **AC-021** [REQ-021] `package.json` is 0.10.0, `release.yml` is unchanged and token-free, and `npm view` and `gh run` status are recorded separately in the verification.

## Public API impact

Additive. New Node-only entry `@doqs/analog/content` (`generateContent`, `checkContent`, `buildContent`, `loadContentConfig`, `formatDiagnostic`, `doqContent`, `DoqContentError`, `EXIT_CODES`, `CONFIG_FILE`, and the types `DoqContentTarget`, `DoqContentOptions`, `DoqContentDiagnostic`, `DoqContentErrorKind`, `DoqContentVitePlugin` and result types), the command `doq content`, and a `symbols` member in the `doq-api` manifest. Nothing is added to `@doqs/analog`'s browser entry.

## Compatibility

Angular `^21.2.2 || ^22.0.0`, Analog `^2.9`, Node `^20.19 || ^22.12 || >=24` as before. Output is plain Markdown; SSR/SSG, hydration, Pagefind and `doqDeterministicMarkdown()` see no difference from hand-written pages. Every 0.9 configuration builds without change.
