# 0010 — Production hardening and compatibility (Doqs 0.7.0)

## Problem

Doqs 0.6 added versioned documentation on top of a stack that is only verified in one configuration. Four weaknesses were observed, each with evidence, not assumed:

1. **Heading ids are not deterministic.** The Angular Movement adoption proof needed six rebuilds before heading ids, tables of contents and search anchors agreed. The cause is upstream and independent of Doqs (reproduced in `docs/repro/heading-id-concurrency.mjs`, and in real builds by `pnpm verify:determinism --control`): `@analogjs/platform` renders each Markdown file in a Vite `load` hook, Vite runs those hooks concurrently, all of them share one `marked` instance, and `marked-gfm-heading-id` keeps its slugger in module state that it resets per render. With an asynchronous marked step (every async highlighter, for example Shiki) two files interleave and receive each other's `-1`/`-2` suffixes. The ids are baked into the bundle, so a bad build ships wrong fragments and TOC links.
2. **Angular 22 and zoneless are claimed, not proven.** The peer range says `^21.2.2 || ^22.0.0` but the repository only builds Angular 21.
3. **Only Chromium is tested.** Scroll restoration, focus and keyboard behaviour differ between engines.
4. **There is no gate on static output** (heading ids, TOC fragments, internal links, canonicals) and none on bundle growth.

## Consumer impact

Additive. No exported type, configuration key, frontmatter key, route or `--host-docs-*` token changes; a 0.6 configuration builds and renders as before.

- New Node-only export `@doqs/analog/vite` with `doqDeterministicMarkdown()`. It is opt-in: a host that renders Markdown through `@analogjs/platform` and wants deterministic heading ids adds it to `plugins` in `vite.config.ts` (both showcases and the adoption proof do).
- A scroll-restoration defect found in WebKit is fixed (Forward to a fragment entry kept the previous position).
- Forced-colors (Windows high contrast) now marks the selected tab and current links without relying on colour.
- Package version `0.7.0`.

## Scope

- Root-cause the heading-id race, reproduce it independently and in real builds, and ship a supported containment plus an integrity check that rejects inconsistent output (DET).
- A reproducible Angular 21 / Angular 22 (TypeScript 6, strict peers) consumer matrix built from the packed tarball, zoneless, with a focused Angular-integration smoke suite (COMP).
- A focused Firefox + WebKit matrix over the existing journeys, with engine-specific fixes (BROWSER).
- Keyboard, reduced-motion, text-size, forced-colors and custom-token coverage (A11Y).
- Measured baselines, a scaling benchmark with generated fixtures and byte budgets (PERF).
- `pnpm docs:check`: static route, heading, TOC, link and canonical validation of the generated output (SEO).
- Documentation, changelog, version bump, CI jobs for the new gates.

## Non-goals

New Markdown directives, a search engine, localisation, new versioning APIs, a CMS, a new router or styling framework, new UI dependencies, replacing Analog's content system or copying its renderer, patching `node_modules`, a new CI platform or release pipeline, migrating Angular Movement, publishing from the feature branch.

## Requirements

- **REQ-001** Heading ids are a pure function of a document. A build never changes a document's ids because of the order in which Vite loads files.
- **REQ-002** The race is reproduced independently of Doqs and its owner is documented with affected versions, trigger conditions, and whether upstream has a fix. A Doqs-provided remediation uses only public Vite and Analog plugin interfaces, does not patch or copy upstream code and renders exactly what a sequential build renders.
- **REQ-003** A build-integrity check rejects any prerendered page whose heading ids differ from a strictly sequential render of that page, that repeats an id, whose table of contents links to a missing id, or that is empty.
- **REQ-004** Repeated clean builds of a stress consumer (duplicate headings, versions, rich Markdown, an asynchronous Markdown step) produce identical heading ids, and the same stress without the remediation is detected as inconsistent.
- **REQ-005** Same-site links (navigation, version switcher, Markdown, generated API pages) reach an existing route and, with a fragment, an existing id; every Markdown source has a prerendered route; canonical links are single, absolute where configured and equal to the page's own route; external links are never fetched.
- **REQ-006** The packed tarball installs, type-checks, builds, prerenders, hydrates and passes the Angular-integration smoke suite under Angular 21.2 and under Angular 22 with TypeScript 6, with peer dependencies checked strictly and without Zone.js.
- **REQ-007** The documentation journeys that depend on the engine (routing, history, fragments, TOC, search, versions, tabs, copy, drawer, focus, themes, overflow, axe) pass in Chromium, Firefox and WebKit on production assets. A browser limitation is handled in the test only when it is a platform limit, and is annotated.
- **REQ-008** Back/Forward restores the scroll position of the entry being returned to in every engine.
- **REQ-009** Reduced motion, 200% text size, forced colours and consumer colour tokens are honoured; the selected tab and current links are distinguishable in forced-colors mode.
- **REQ-010** Keyboard operation of the drawer (open, Escape, focus return, no tab stop in the closed drawer), search, tabs and the version selector is covered; focus after Back is not lost.
- **REQ-011** Bundle size, core CSS size, search-index output and generated asset counts are measured; budgets with a baseline, a threshold and a reason fail the build on regression. The growth of content metadata is measured on generated fixtures of 20, 200 and 1000 documents.
- **REQ-012** Metadata lifecycle (title, description, canonical) does not leak between documentation pages, versions and host routes, and never replaces a host-authored canonical.
- **REQ-013** Existing guarantees hold: embedded and docs-first documentation, search, versioning, slugs, rich Markdown, demos, slots, tokens, API reference, SSR/SSG, 0.6 configurations, the Angular Movement proof.
- **REQ-014** The package is `0.7.0`; README, package README, changelog, CONTRIBUTING and website state only what was tested; the release workflow, Trusted Publishing and deploy workflow are unchanged.

## Acceptance cases

- **AC-001** [REQ-001] [REQ-002] `docs/repro/heading-id-concurrency.mjs` prints wrong ids for concurrent renders in both modes it demonstrates; a unit case with the real `marked` and `marked-gfm-heading-id` shows the same through a stand-in of Analog's plugin, and shows that the same loads through `doqDeterministicMarkdown()` equal a sequential render, in any order, across failures.
- **AC-002** [REQ-002] [REQ-004] `pnpm verify:determinism` builds the stress consumer five times from clean and prints one heading fingerprint and zero `docs:check` failures; `pnpm verify:determinism --control` (guard removed) is detected as inconsistent.
- **AC-003** [REQ-003] [REQ-005] Table-driven unit cases accept a correct page and reject: a duplicate heading without its suffix, suffixes of another document, an empty page, a missing or repeated `h1`, a TOC that omits headings or links to a missing id, a broken link, a broken fragment, several or foreign canonicals, a Markdown source without a route and a documentation page without a source.
- **AC-004** [REQ-005] `pnpm docs:check` passes on both showcases, the tarball consumers and the Angular Movement proof, reporting the pages, headings and links it examined.
- **AC-005** [REQ-006] `pnpm verify:compat` builds consumers with `--angular=21` and `--angular=22` (strict peers, TypeScript 6 for 22), runs `doq-api check`, `doq-search`, `docs:check` and `e2e/compat.spec.ts`, which asserts the installed Angular version, the absence of Zone.js, hydration, client navigation with history, tabs by keyboard, search by shortcut, version switching and generated API pages without console errors.
- **AC-006** [REQ-007] `pnpm test:e2e:browsers` passes in Firefox and WebKit with the same production assets and the same assertions as Chromium, except where annotated.
- **AC-007** [REQ-008] The Back/Forward fragment test passes in all three engines (it failed in WebKit before the fix).
- **AC-008** [REQ-009] `e2e/hardening.spec.ts` passes in three engines (forced colours in Chromium and Firefox): reduced motion, 200% text at 320 and 1280 px, forced-colors, consumer tokens with axe contrast.
- **AC-009** [REQ-010] The same spec covers the drawer by keyboard and focus after Back; existing search, tabs and version keyboard cases run in all engines.
- **AC-010** [REQ-011] `pnpm perf:check` compares the artifacts with `perf-budgets.json`; `pnpm perf:scale` records build time, JS size, search index size and static page count for 20, 200 and 1000 generated documents.
- **AC-011** [REQ-012] Component and E2E cases confirm titles, descriptions and canonical links across navigation, versions, missing documents and host routes.
- **AC-012** [REQ-013] The complete quality gate, the CDP MVP harness, negative controls, tarball consumers and the Angular Movement proof pass.
- **AC-013** [REQ-014] `pnpm verify:package` passes for `0.7.0` including the new export; documentation states supported and verified versions exactly.

## Public API impact

Additive: package export `./vite` (`doqDeterministicMarkdown`, `DoqDeterministicMarkdownOptions`, `DoqVitePlugin`). Nothing is added to the Angular entry point, which does not import Node or Vite modules. No breaking change.

## Compatibility

- Angular `^21.2.2 || ^22.0.0` (unchanged), Analog 2.9, TypeScript `^5.5 || ^6` (6.0 with Angular 22), Node `^20.19 || ^22.12 || >=24`, Vite 8 as installed by the showcases. No peer range is widened.
- Verified: Angular 21.2.x (all suites) and 22.2.x with TypeScript 6.0.x (focused smoke), both without Zone.js. Not verified: applications that load Zone.js, Vite below 8 with the new plugin, Analog above 2.9.x.
- `doqDeterministicMarkdown()` needs Analog's `analogjs-content-file` plugin; it throws at config time with an actionable message when it is missing.
- Existing 0.6 configurations, including the unversioned 0.5 style, are exercised by the legacy tarball consumers.
